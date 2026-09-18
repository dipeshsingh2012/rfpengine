from __future__ import annotations

import csv
import io
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.models.schemas import KBEntryCreate

logger = logging.getLogger(__name__)


class DocumentParserService:
    """
    Parses arbitrary enterprise document formats (CSV, TSV, JSON, JSONL, PDF, DOCX, Markdown, TXT)
    into structured passage chunks (title, content, category, metadata) with optimal 300-500 token chunking.
    """

    CHUNK_SIZE_CHARS = 1600  # ~400 tokens
    CHUNK_OVERLAP_CHARS = 200  # ~50 tokens

    ALLOWED_EXTENSIONS = {
        ".csv", ".tsv", ".xlsx", ".xls", ".pdf", ".docx", ".txt", ".md", ".markdown"
    }

    @classmethod
    def infer_category(cls, filename: str, sample_text: str = "", override: Optional[str] = None) -> str:
        """
        Infers the enterprise taxonomy category from filename and content signals.
        """
        if override and override.strip():
            return override.strip()

        combined = f"{filename} {sample_text[:1200]}".lower()

        # Check Privacy & Legal first
        if any(k in combined for k in ["privacy", "gdpr", "ccpa", "dsar", "subprocessor", "dpa", "retention", "erasure", "legal"]):
            return "Privacy & Legal"

        # Check SLA & Operations
        if any(k in combined for k in ["sla", "uptime", "disaster", "recovery", "rpo", "rto", "backup", "support tier", "incident", "failover", "sre", "operations"]):
            return "SLA & Operations"

        # Check Product & Integrations
        if any(k in combined for k in ["api", "integration", "webhook", "connector", "sdk", "rest", "endpoint", "salesforce", "jira"]):
            return "Product & Integrations"

        # Check HR & Corporate Policies
        if any(k in combined for k in ["conduct", "employee", "human resource", "background check", "training", "code_of_conduct", "hr_policies", "hr policy"]):
            return "HR & Corporate Policies"

        # Check Cloud & Infrastructure
        if any(k in combined for k in ["architect", "cloud", "aws", "infrastructure", "vpc", "hosting", "kubernetes"]):
            return "Cloud & Architecture"

        # Check Compliance
        if any(k in combined for k in ["soc 2", "soc2", "soc-2", "iso 27001", "iso27001", "compliance", "audit", "certif", "whitepaper", "hipaa", "pci-dss"]):
            return "Compliance & Security"

        # Check Security & Cryptography
        if any(k in combined for k in ["secur", "encrypt", "cipher", "tls", "aes", "kms", "vulnerab", "pen test", "auth", "mfa", "sso", "fido2"]):
            return "Security & Cryptography"

        if "policy" in combined or "hr" in combined:
            return "HR & Corporate Policies"

        return "General"

    @classmethod
    def parse_document(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str = "acme-corp",
        default_category: Optional[str] = None,
    ) -> List[KBEntryCreate]:
        lower_name = filename.lower()

        if not any(lower_name.endswith(ext) for ext in cls.ALLOWED_EXTENSIONS):
            raise ValueError(
                f"Unsupported file format for '{filename}'. Allowed formats: "
                + ", ".join(sorted(cls.ALLOWED_EXTENSIONS))
            )

        if lower_name.endswith(".csv") or lower_name.endswith(".tsv"):
            return cls._parse_tabular(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
            return cls._parse_excel(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".pdf"):
            return cls._parse_pdf(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".docx"):
            return cls._parse_docx(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".md") or lower_name.endswith(".markdown"):
            return cls._parse_markdown(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".txt"):
            return cls._parse_text(content, filename, tenant_id, default_category)
        else:
            return cls._parse_text(content, filename, tenant_id, default_category)

    # --- 1. Tabular Parser (CSV / TSV) ---
    @classmethod
    def _parse_tabular(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        text_content = content.decode("utf-8-sig", errors="replace")
        delimiter = "\t" if filename.lower().endswith(".tsv") else ","
        if delimiter == "," and "\t" in text_content[:200] and "," not in text_content[:200]:
            delimiter = "\t"

        reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
        entries: List[KBEntryCreate] = []

        for row_idx, row in enumerate(reader, start=1):
            if not row:
                continue

            norm_row = {k.strip("\ufeff\ufeef\ufffe").strip().lower(): v.strip() for k, v in row.items() if k and v}

            title = (
                norm_row.get("title")
                or norm_row.get("topic")
                or norm_row.get("question")
                or norm_row.get("prompt")
                or norm_row.get("q")
                or norm_row.get("inquiry")
                or norm_row.get("requirement")
                or f"{filename} - Row {row_idx}"
            )

            body_content = (
                norm_row.get("content")
                or norm_row.get("text")
                or norm_row.get("answer")
                or norm_row.get("response")
                or norm_row.get("details")
                or norm_row.get("a")
                or title
            )

            category = (
                norm_row.get("category")
                or norm_row.get("section")
                or norm_row.get("domain")
                or norm_row.get("tag")
                or cls.infer_category(filename, body_content or "", default_category)
            )

            if title or body_content:
                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        title=title,
                        content=body_content,
                        category=category,
                        metadata={
                            "source_file": filename,
                            "row_number": row_idx,
                            "format": "csv",
                        },
                    )
                )

        logger.info("Parsed %d entries from CSV/TSV file '%s'", len(entries), filename)
        return entries

    # --- 2. Excel Parser (.xlsx / .xls) ---
    @classmethod
    def _parse_excel(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        entries: List[KBEntryCreate] = []

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))
            if not rows or len(rows) < 2:
                continue

            headers = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
            q_col = -1
            a_col = -1
            sec_col = -1

            for idx, h in enumerate(headers):
                if any(k in h for k in ["question", "prompt", "requirement", "topic", "q", "title"]) and q_col == -1:
                    q_col = idx
                if any(k in h for k in ["answer", "response", "content", "details", "solution", "description"]) and a_col == -1:
                    a_col = idx
                if any(k in h for k in ["category", "section", "domain"]) and sec_col == -1:
                    sec_col = idx

            if q_col == -1:
                q_col = 0
            if a_col == -1 and len(headers) > 1:
                a_col = 1

            for r_idx, row in enumerate(rows[1:], start=2):
                if not row:
                    continue
                q_val = str(row[q_col]).strip() if q_col < len(row) and row[q_col] is not None else ""
                a_val = str(row[a_col]).strip() if a_col != -1 and a_col < len(row) and row[a_col] is not None else ""
                sec_val = str(row[sec_col]).strip() if sec_col != -1 and sec_col < len(row) and row[sec_col] is not None else sheet_name

                body = a_val if a_val else q_val
                if not body or len(body) < 5 or body.lower() == "none":
                    continue

                cat = sec_val or cls.infer_category(filename, body, default_category)
                title = q_val if q_val and a_val else f"{filename} - {sheet_name} R{r_idx}"

                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        title=title[:250],
                        content=body,
                        category=cat,
                        metadata={
                            "source_file": filename,
                            "sheet": sheet_name,
                            "row": r_idx,
                        },
                    )
                )

        logger.info("Parsed %d entries from Excel file '%s'", len(entries), filename)
        return entries

    # --- 3. Markdown Parser (Heading-Aware) ---
    @classmethod
    def _parse_markdown(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        text_content = content.decode("utf-8", errors="replace")
        heading_pattern = re.compile(r"^(#{1,4}\s+.+)$", re.MULTILINE)
        splits = heading_pattern.split(text_content)

        entries: List[KBEntryCreate] = []
        current_heading = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")

        for i in range(len(splits)):
            part = splits[i].strip()
            if not part:
                continue

            if part.startswith("#"):
                current_heading = part.lstrip("#").strip()
            else:
                chunks = cls._chunk_text(part, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
                for chunk_idx, chunk in enumerate(chunks, start=1):
                    if len(chunk) < 30:
                        continue
                    section_title = f"{current_heading} (Part {chunk_idx})" if len(chunks) > 1 else current_heading
                    inferred_cat = cls.infer_category(filename, f"{current_heading} {chunk}", default_category)
                    entries.append(
                        KBEntryCreate(
                            tenant_id=tenant_id,
                            title=section_title,
                            content=chunk,
                            category=inferred_cat,
                            metadata={
                                "source_file": filename,
                                "section": current_heading,
                                "chunk_index": chunk_idx,
                            },
                        )
                    )

        logger.info("Parsed %d chunks from Markdown file '%s'", len(entries), filename)
        return entries

    # --- 4. PDF Parser (Page & Paragraph Aware) ---
    @classmethod
    def _parse_pdf(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        import pypdf

        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        entries: List[KBEntryCreate] = []
        base_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

        for page_num, page in enumerate(pdf_reader.pages, start=1):
            page_text = page.extract_text() or ""
            page_text = re.sub(r"\s+", " ", page_text).strip()
            if not page_text:
                continue

            chunks = cls._chunk_text(page_text, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
            for chunk_idx, chunk in enumerate(chunks, start=1):
                if len(chunk) < 40:
                    continue

                first_period = chunk.find(". ")
                topic_snippet = chunk[:first_period].strip() if 10 < first_period < 100 else chunk[:60].strip()
                passage_title = f"{base_name} - Page {page_num}: {topic_snippet}..." if topic_snippet else f"{base_name} - Page {page_num}"
                inferred_cat = cls.infer_category(filename, chunk, default_category)

                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        title=passage_title,
                        content=chunk,
                        category=inferred_cat,
                        metadata={
                            "source_file": filename,
                            "page_number": page_num,
                            "chunk_index": chunk_idx,
                            "format": "pdf",
                        },
                    )
                )

        logger.info("Parsed %d chunks from PDF '%s' across %d pages", len(entries), filename, len(pdf_reader.pages))
        return entries

    # --- 5. DOCX Parser ---
    @classmethod
    def _parse_docx(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        import docx

        doc = docx.Document(io.BytesIO(content))
        entries: List[KBEntryCreate] = []
        current_heading = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        current_buffer = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            if p.style.name.startswith("Heading"):
                if current_buffer:
                    full_text = " ".join(current_buffer)
                    chunks = cls._chunk_text(full_text, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
                    for c_idx, chunk in enumerate(chunks, start=1):
                        inferred_cat = cls.infer_category(filename, f"{current_heading} {chunk}", default_category)
                        entries.append(
                            KBEntryCreate(
                                tenant_id=tenant_id,
                                title=f"{current_heading} (Part {c_idx})" if len(chunks) > 1 else current_heading,
                                content=chunk,
                                category=inferred_cat,
                                metadata={"source_file": filename, "section": current_heading},
                            )
                        )
                    current_buffer = []
                current_heading = text
            else:
                current_buffer.append(text)

        if current_buffer:
            full_text = " ".join(current_buffer)
            chunks = cls._chunk_text(full_text, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
            for c_idx, chunk in enumerate(chunks, start=1):
                inferred_cat = cls.infer_category(filename, f"{current_heading} {chunk}", default_category)
                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        title=f"{current_heading} (Part {c_idx})" if len(chunks) > 1 else current_heading,
                        content=chunk,
                        category=inferred_cat,
                        metadata={"source_file": filename, "section": current_heading},
                    )
                )

        logger.info("Parsed %d chunks from DOCX '%s'", len(entries), filename)
        return entries

    # --- 6. Plain Text / Fallback Parser ---
    @classmethod
    def _parse_text(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        text_content = content.decode("utf-8", errors="replace").strip()
        chunks = cls._chunk_text(text_content, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
        entries: List[KBEntryCreate] = []
        base_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

        for idx, chunk in enumerate(chunks, start=1):
            if len(chunk) < 30:
                continue
            first_period = chunk.find(". ")
            snippet = chunk[:first_period].strip() if 10 < first_period < 100 else chunk[:60].strip()
            passage_title = f"{base_name} ({snippet})" if snippet else base_name
            inferred_cat = cls.infer_category(filename, chunk, default_category)
            entries.append(
                KBEntryCreate(
                    tenant_id=tenant_id,
                    title=passage_title,
                    content=chunk,
                    category=inferred_cat,
                    metadata={"source_file": filename, "chunk_index": idx},
                )
            )

        logger.info("Parsed %d chunks from text file '%s'", len(entries), filename)
        return entries

    # --- Helper: Recursive Character Sliding Window Chunker ---
    @classmethod
    def _chunk_text(cls, text: str, max_size: int, overlap: int) -> List[str]:
        if len(text) <= max_size:
            return [text] if text.strip() else []

        chunks: List[str] = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + max_size, text_len)

            if end < text_len:
                last_newline = text.rfind("\n", start + max_size // 2, end)
                if last_newline != -1:
                    end = last_newline + 1
                else:
                    last_period = text.rfind(". ", start + max_size // 2, end)
                    if last_period != -1:
                        end = last_period + 2

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= text_len:
                break

            start = max(start + 1, end - overlap)

        return chunks
