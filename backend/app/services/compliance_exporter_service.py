from __future__ import annotations

import csv
import datetime
import io
import re
from typing import Any, Dict, List, Optional, Tuple

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.schemas import ExportRequestPayload, ExportItemPayload
from app.services.excel_service import sanitize_excel_cell, sanitize_filename_part


class ComplianceExporterService:
    """
    Enterprise Compliance & Audit Package Exporter.
    Generates branded .xlsx workbooks, .docx documents, and .pdf audit reports.
    """

    @classmethod
    def export(cls, payload: ExportRequestPayload) -> Tuple[bytes, str, str]:
        """
        Exports the payload to the requested format.
        Returns: (file_bytes, mime_type, filename)
        """
        fmt = payload.format.lower().strip()
        safe_title = sanitize_filename_part(payload.title.replace(" ", "-")) or "rfp-response"
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")

        if fmt == "xlsx":
            content = cls.export_excel(payload)
            mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{safe_title}-compliance-matrix-{timestamp}.xlsx"
        elif fmt == "docx":
            content = cls.export_docx(payload)
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"{safe_title}-audit-package-{timestamp}.docx"
        elif fmt == "pdf":
            content = cls.export_pdf(payload)
            mime = "application/pdf"
            filename = f"{safe_title}-compliance-report-{timestamp}.pdf"
        elif fmt == "csv":
            content = cls.export_csv(payload)
            mime = "text/csv; charset=utf-8"
            filename = f"{safe_title}-responses-{timestamp}.csv"
        else:
            raise ValueError(f"Unsupported export format '{fmt}'. Supported: xlsx, docx, pdf, csv")

        return content, mime, filename

    # ==========================================
    # 1. EXCEL (.xlsx) EXPORTER
    # ==========================================
    @classmethod
    def export_excel(cls, payload: ExportRequestPayload) -> bytes:
        wb = openpyxl.Workbook()

        # Sheet 1: Compliance Matrix
        ws = wb.active
        ws.title = "Compliance Matrix"
        ws.views.sheetView[0].showGridLines = True

        # Header definitions
        headers = [
            "Item #",
            "Section",
            "Question / RFP Requirement",
            "Approved Vendor Response",
            "Review Status",
            "Assigned SME Role",
            "Confidence",
            "Cited Sources",
            "SME Review Comments",
        ]

        # Header styling
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")  # Slate 800
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        thin_border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[1].height = 28

        # Status styling map
        status_styles = {
            "Approved": {
                "fill": PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"),  # Green 100
                "font": Font(name="Calibri", size=10, bold=True, color="166534"),                 # Green 800
            },
            "In Review": {
                "fill": PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),  # Amber 100
                "font": Font(name="Calibri", size=10, bold=True, color="92400E"),                 # Amber 800
            },
            "Changes Requested": {
                "fill": PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid"),  # Red 100
                "font": Font(name="Calibri", size=10, bold=True, color="991B1B"),                 # Red 800
            },
            "Draft": {
                "fill": PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid"),  # Slate 100
                "font": Font(name="Calibri", size=10, bold=False, color="475569"),                # Slate 600
            },
        }

        # Populate rows
        for idx, item in enumerate(payload.items, start=1):
            row_num = idx + 1
            sources_str = cls._format_sources_summary(item.sources)
            conf_str = f"{int(item.confidence_score * 100)}%" if item.confidence_score else "N/A"
            status_val = item.review_status or "Draft"

            row_data = [
                sanitize_excel_cell(f"Q-{idx:03d}"),
                sanitize_excel_cell(item.section or "General"),
                sanitize_excel_cell(item.question_text),
                sanitize_excel_cell(item.answer_text),
                sanitize_excel_cell(status_val),
                sanitize_excel_cell(item.assigned_role or "Security SME"),
                sanitize_excel_cell(conf_str),
                sanitize_excel_cell(sources_str),
                sanitize_excel_cell(item.comments or ""),
            ]
            ws.append(row_data)

            # Style each cell in the row
            for col_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(row=row_num, column=col_idx)
                cell.border = thin_border
                cell.font = Font(name="Calibri", size=10, color="0F172A")
                
                # Alignments
                if col_idx in [1, 5, 6, 7]:
                    cell.alignment = Alignment(horizontal="center", vertical="top")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

                # Conditional styling for Review Status column
                if col_idx == 5:
                    matched_style = None
                    for k, st in status_styles.items():
                        if k.lower() in status_val.lower():
                            matched_style = st
                            break
                    if not matched_style:
                        matched_style = status_styles["Draft"]
                    cell.fill = matched_style["fill"]
                    cell.font = matched_style["font"]

            ws.row_dimensions[row_num].height = 42

        # Auto-fit column widths
        col_width_hints = {
            1: 10,  # Item #
            2: 18,  # Section
            3: 40,  # Question
            4: 55,  # Answer
            5: 18,  # Status
            6: 22,  # SME Role
            7: 14,  # Confidence
            8: 30,  # Citations
            9: 25,  # Comments
        }
        for col_idx, width in col_width_hints.items():
            ws.column_dimensions[get_column_letter(col_idx)].width = width

        # Auto filter
        ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(payload.items) + 1}"

        # Sheet 2: Audit Trail & Citations
        cls._build_excel_audit_sheet(wb, payload)

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @classmethod
    def _build_excel_audit_sheet(cls, wb: openpyxl.Workbook, payload: ExportRequestPayload):
        ws = wb.create_sheet(title="Audit Trail & Citations")
        ws.views.sheetView[0].showGridLines = True

        title_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
        sub_font = Font(name="Calibri", size=11, bold=True, color="334155")
        bold_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        regular_font = Font(name="Calibri", size=10, color="334155")
        border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="E2E8F0"),
            bottom=Side(style="thin", color="E2E8F0"),
        )
        header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        ws.cell(row=1, column=1, value="RFP Compliance Audit Package & Provenance").font = title_font
        ws.cell(row=2, column=1, value=f"Generated: {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}").font = regular_font

        total = len(payload.items)
        approved = sum(1 for i in payload.items if "approved" in (i.review_status or "").lower())
        pct = int((approved / total) * 100) if total > 0 else 0

        metadata_rows = [
            ("Workspace Title", payload.title),
            ("Tenant ID", payload.tenant_id),
            ("Total Questionnaire Items", str(total)),
            ("Approved Items", f"{approved} ({pct}%)"),
            ("Governance Status", "Full Sign-Off Complete" if approved == total and total > 0 else "Pending Reviews"),
        ]

        ws.cell(row=4, column=1, value="Governance Summary").font = sub_font
        for r_idx, (label, val) in enumerate(metadata_rows, start=5):
            c1 = ws.cell(row=r_idx, column=1, value=label)
            c1.font = bold_font
            c1.fill = header_fill
            c1.border = border
            c2 = ws.cell(row=r_idx, column=2, value=val)
            c2.font = regular_font
            c2.border = border

        # Distinct sources cited table
        start_sources_row = len(metadata_rows) + 7
        ws.cell(row=start_sources_row, column=1, value="Cited Knowledge Base Documents").font = sub_font
        
        source_counts: Dict[str, int] = {}
        for item in payload.items:
            for s in (item.sources or []):
                src_name = ""
                if isinstance(s, dict):
                    src_name = s.get("source_file") or s.get("title") or s.get("id") or "Knowledge Base"
                elif hasattr(s, "source_file"):
                    src_name = getattr(s, "source_file") or getattr(s, "title") or "Knowledge Base"
                else:
                    src_name = str(s)
                if src_name:
                    source_counts[src_name] = source_counts.get(src_name, 0) + 1

        headers = ["Source Document / Repository", "Citations Count"]
        ws.cell(row=start_sources_row + 1, column=1, value=headers[0]).font = bold_font
        ws.cell(row=start_sources_row + 1, column=1).fill = header_fill
        ws.cell(row=start_sources_row + 1, column=1).border = border
        ws.cell(row=start_sources_row + 1, column=2, value=headers[1]).font = bold_font
        ws.cell(row=start_sources_row + 1, column=2).fill = header_fill
        ws.cell(row=start_sources_row + 1, column=2).border = border

        for s_idx, (src, cnt) in enumerate(sorted(source_counts.items(), key=lambda x: x[1], reverse=True), start=start_sources_row + 2):
            c1 = ws.cell(row=s_idx, column=1, value=src)
            c1.font = regular_font
            c1.border = border
            c2 = ws.cell(row=s_idx, column=2, value=cnt)
            c2.font = regular_font
            c2.border = border
            c2.alignment = Alignment(horizontal="center")

        ws.column_dimensions["A"].width = 35
        ws.column_dimensions["B"].width = 40

    # ==========================================
    # 2. WORD (.docx) EXPORTER
    # ==========================================
    @classmethod
    def export_docx(cls, payload: ExportRequestPayload) -> bytes:
        doc = docx.Document()

        # Adjust page margins
        for section in doc.sections:
            section.top_margin = Inches(0.8)
            section.bottom_margin = Inches(0.8)
            section.left_margin = Inches(0.8)
            section.right_margin = Inches(0.8)

        # Document Title
        title_p = doc.add_paragraph()
        title_p.paragraph_format.space_before = Pt(0)
        title_p.paragraph_format.space_after = Pt(4)
        run_title = title_p.add_run(payload.title)
        run_title.font.name = "Calibri"
        run_title.font.size = Pt(22)
        run_title.font.bold = True
        run_title.font.color.rgb = RGBColor(15, 23, 42)

        sub_p = doc.add_paragraph()
        sub_p.paragraph_format.space_after = Pt(16)
        run_sub = sub_p.add_run("Enterprise RFP Response & Compliance Audit Package")
        run_sub.font.name = "Calibri"
        run_sub.font.size = Pt(12)
        run_sub.font.color.rgb = RGBColor(100, 116, 139)

        # Metadata Table
        meta_table = doc.add_table(rows=4, cols=2)
        meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        meta_table.autofit = False

        total = len(payload.items)
        approved = sum(1 for i in payload.items if "approved" in (i.review_status or "").lower())
        pct = int((approved / total) * 100) if total > 0 else 0

        metadata = [
            ("Tenant ID", payload.tenant_id),
            ("Audit Timestamp", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")),
            ("Questionnaire Scope", f"{total} Questions Total"),
            ("Governance Status", f"{approved} of {total} Approved ({pct}%)"),
        ]

        for idx, (label, val) in enumerate(metadata):
            cell_lbl = meta_table.cell(idx, 0)
            cell_lbl.width = Inches(2.0)
            p_lbl = cell_lbl.paragraphs[0]
            p_lbl.paragraph_format.space_after = Pt(2)
            r_lbl = p_lbl.add_run(label)
            r_lbl.font.bold = True
            r_lbl.font.size = Pt(9.5)
            r_lbl.font.color.rgb = RGBColor(51, 65, 85)

            cell_val = meta_table.cell(idx, 1)
            cell_val.width = Inches(4.5)
            p_val = cell_val.paragraphs[0]
            p_val.paragraph_format.space_after = Pt(2)
            r_val = p_val.add_run(val)
            r_val.font.size = Pt(9.5)
            r_val.font.color.rgb = RGBColor(15, 23, 42)

        doc.add_paragraph().paragraph_format.space_after = Pt(14)

        # Questions & Answers
        h2 = doc.add_heading("Questionnaire Responses", level=1)
        h2.paragraph_format.space_before = Pt(10)
        h2.paragraph_format.space_after = Pt(8)

        current_section = None
        for idx, item in enumerate(payload.items, start=1):
            sec = item.section or "General"
            if sec != current_section:
                current_section = sec
                sec_head = doc.add_heading(f"Section: {current_section}", level=2)
                sec_head.paragraph_format.space_before = Pt(12)
                sec_head.paragraph_format.space_after = Pt(6)

            # Question item container
            q_p = doc.add_paragraph()
            q_p.paragraph_format.space_before = Pt(8)
            q_p.paragraph_format.space_after = Pt(3)
            r_num = q_p.add_run(f"Q{idx:02d}. ")
            r_num.font.bold = True
            r_num.font.size = Pt(11)
            r_num.font.color.rgb = RGBColor(30, 41, 59)

            r_text = q_p.add_run(item.question_text)
            r_text.font.bold = True
            r_text.font.size = Pt(11)
            r_text.font.color.rgb = RGBColor(15, 23, 42)

            # Answer block
            ans_p = doc.add_paragraph()
            ans_p.paragraph_format.left_indent = Inches(0.2)
            ans_p.paragraph_format.space_after = Pt(4)
            r_ans = ans_p.add_run(item.answer_text or "(No answer recorded)")
            r_ans.font.size = Pt(10.5)
            r_ans.font.color.rgb = RGBColor(30, 41, 59)

            # Governance Stamp Line
            status_p = doc.add_paragraph()
            status_p.paragraph_format.left_indent = Inches(0.2)
            status_p.paragraph_format.space_after = Pt(10)

            conf_str = f"{int(item.confidence_score * 100)}%" if item.confidence_score else "N/A"
            stamp_text = f"✓ {item.review_status or 'Draft'}  |  Reviewer: {item.assigned_role or 'Security SME'}  |  AI Confidence: {conf_str}"
            r_stamp = status_p.add_run(stamp_text)
            r_stamp.font.size = Pt(9)
            r_stamp.font.bold = True
            if "approved" in (item.review_status or "").lower():
                r_stamp.font.color.rgb = RGBColor(22, 101, 52)
            else:
                r_stamp.font.color.rgb = RGBColor(146, 64, 14)

            # Citations if present
            sources_str = cls._format_sources_summary(item.sources)
            if sources_str:
                src_p = doc.add_paragraph()
                src_p.paragraph_format.left_indent = Inches(0.2)
                src_p.paragraph_format.space_after = Pt(10)
                r_src_label = src_p.add_run("Evidence Citations: ")
                r_src_label.font.size = Pt(8.5)
                r_src_label.font.bold = True
                r_src_label.font.color.rgb = RGBColor(100, 116, 139)
                r_src = src_p.add_run(sources_str)
                r_src.font.size = Pt(8.5)
                r_src.font.color.rgb = RGBColor(100, 116, 139)

        output = io.BytesIO()
        doc.save(output)
        return output.getvalue()

    # ==========================================
    # 3. PDF EXPORTER (ReportLab)
    # ==========================================
    @classmethod
    def export_pdf(cls, payload: ExportRequestPayload) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4,
        )
        sub_style = ParagraphStyle(
            "DocSub",
            parent=styles["Normal"],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=14,
        )
        meta_label_style = ParagraphStyle(
            "MetaLabel",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#334155"),
        )
        meta_val_style = ParagraphStyle(
            "MetaVal",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#0F172A"),
        )
        q_style = ParagraphStyle(
            "QuestionStyle",
            parent=styles["Normal"],
            fontSize=10,
            leading=13,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=3,
        )
        ans_style = ParagraphStyle(
            "AnswerStyle",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
            spaceAfter=4,
        )
        stamp_style = ParagraphStyle(
            "StampStyle",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#166534"),
            spaceAfter=8,
        )
        citation_style = ParagraphStyle(
            "CitationStyle",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=12,
        )

        story = []

        # Header Title
        story.append(Paragraph(cls._escape_xml(payload.title), title_style))
        story.append(
            Paragraph(
                f"Enterprise RFP Response & Compliance Audit Package &bull; Tenant: {payload.tenant_id} &bull; Generated: {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
                sub_style,
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=12))

        # Metrics Box Table
        total = len(payload.items)
        approved = sum(1 for i in payload.items if "approved" in (i.review_status or "").lower())
        pct = int((approved / total) * 100) if total > 0 else 0

        summary_data = [
            [
                Paragraph("<b>Total Items:</b>", meta_label_style),
                Paragraph(str(total), meta_val_style),
                Paragraph("<b>Approved Responses:</b>", meta_label_style),
                Paragraph(f"{approved} ({pct}%)", meta_val_style),
            ],
            [
                Paragraph("<b>Target Tenant:</b>", meta_label_style),
                Paragraph(payload.tenant_id, meta_val_style),
                Paragraph("<b>Audit Status:</b>", meta_label_style),
                Paragraph("Full SME Sign-off" if approved == total and total > 0 else "Reviews In Progress", meta_val_style),
            ],
        ]
        sum_table = Table(summary_data, colWidths=[100, 150, 120, 160])
        sum_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(sum_table)
        story.append(Spacer(1, 14))

        # Responses List
        for idx, item in enumerate(payload.items, start=1):
            q_text = f"Q{idx:02d}. [{cls._escape_xml(item.section or 'General')}] {cls._escape_xml(item.question_text)}"
            ans_text = cls._escape_xml(item.answer_text or "(No answer provided)")
            sources_str = cls._format_sources_summary(item.sources)
            conf_str = f"{int(item.confidence_score * 100)}%" if item.confidence_score else "N/A"
            status_text = f"Status: {item.review_status or 'Draft'}  |  Reviewer: {item.assigned_role or 'Security SME'}  |  Confidence: {conf_str}"

            item_flow = [
                Paragraph(q_text, q_style),
                Paragraph(ans_text, ans_style),
                Paragraph(status_text, stamp_style),
            ]
            if sources_str:
                item_flow.append(Paragraph(f"Citations: {cls._escape_xml(sources_str)}", citation_style))
            item_flow.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

            story.append(KeepTogether(item_flow))

        doc.build(story)
        return buf.getvalue()

    # ==========================================
    # 4. CSV EXPORTER
    # ==========================================
    @classmethod
    def export_csv(cls, payload: ExportRequestPayload) -> bytes:
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Item #",
            "Section",
            "Question",
            "Answer",
            "Review Status",
            "Assigned SME",
            "Confidence",
            "Sources",
            "Comments",
        ])

        for idx, item in enumerate(payload.items, start=1):
            conf_str = f"{int(item.confidence_score * 100)}%" if item.confidence_score else ""
            sources_str = cls._format_sources_summary(item.sources)
            writer.writerow([
                sanitize_excel_cell(f"Q-{idx:03d}"),
                sanitize_excel_cell(item.section or "General"),
                sanitize_excel_cell(item.question_text),
                sanitize_excel_cell(item.answer_text),
                sanitize_excel_cell(item.review_status or "Draft"),
                sanitize_excel_cell(item.assigned_role or ""),
                sanitize_excel_cell(conf_str),
                sanitize_excel_cell(sources_str),
                sanitize_excel_cell(item.comments or ""),
            ])

        return output.getvalue().encode("utf-8-sig")

    # ==========================================
    # Helpers
    # ==========================================
    @classmethod
    def _format_sources_summary(cls, sources: Optional[List[Any]]) -> str:
        if not sources:
            return ""
        titles = []
        for s in sources:
            if isinstance(s, dict):
                t = s.get("source_file") or s.get("title") or s.get("id") or ""
            elif hasattr(s, "source_file"):
                t = getattr(s, "source_file") or getattr(s, "title") or ""
            else:
                t = str(s)
            if t and t not in titles:
                titles.append(t)
        return "; ".join(titles[:4])

    @classmethod
    def _escape_xml(cls, text: str) -> str:
        """Escapes XML entities for ReportLab paragraphs."""
        if not text:
            return ""
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

