from __future__ import annotations

import csv
import io
import logging
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ExtractedQuestion(BaseModel):
    id: str
    question_text: str
    section: Optional[str] = None
    sheet_name: Optional[str] = None
    row_index: Optional[int] = None
    expected_type: str = "narrative"  # narrative, boolean, choice, numeric
    options: List[str] = []


class QuestionnaireParseResult(BaseModel):
    filename: str
    format: str
    total_questions: int
    sections: List[str]
    questions: List[ExtractedQuestion]


class QuestionnaireParserService:
    """
    Intelligent multi-format enterprise questionnaire parser.
    Supports Excel (.xlsx, .xls, .csv), Word (.docx), and PDF (.pdf).
    Extracts structured question items, sections, and answer expectations.
    """

    QUESTION_HEADER_KEYWORDS = [
        "question", "questions", "prompt", "inquiry", "requirement", "requirements",
        "specification", "criteria", "security requirement", "standard", "description"
    ]

    ANSWER_HEADER_KEYWORDS = [
        "answer", "response", "reply", "vendor response", "bidder response",
        "solution", "compliance response", "comments"
    ]

    SECTION_HEADER_KEYWORDS = [
        "section", "category", "domain", "module", "area", "pillar",
        "topic", "group", "family"
    ]

    ID_HEADER_KEYWORDS = [
        "id", "item", "item #", "item no", "item id", "q#", "ref", "reference", "req #", "control id", "#", "no"
    ]

    @classmethod
    def parse_questionnaire(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        lower_name = filename.lower()

        if lower_name.endswith((".xlsx", ".xls")):
            return cls._parse_excel(content, filename)
        elif lower_name.endswith((".csv", ".tsv")):
            return cls._parse_csv(content, filename)
        elif lower_name.endswith(".docx"):
            return cls._parse_docx(content, filename)
        elif lower_name.endswith(".pdf"):
            return cls._parse_pdf(content, filename)
        else:
            raise ValueError(
                f"Unsupported questionnaire format for '{filename}'. "
                "Supported formats: Excel (.xlsx, .xls, .csv), Word (.docx), PDF (.pdf)."
            )

    @classmethod
    def _parse_excel(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        all_questions: List[ExtractedQuestion] = []
        sections_set = set()

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue

            # Detect header row (within first 15 rows)
            header_idx = -1
            q_col_idx = -1
            sec_col_idx = -1
            id_col_idx = -1

            for r_idx, row in enumerate(rows[:15]):
                row_str_cells = [str(c).strip().lower() if c is not None else "" for c in row]

                # 1. First pass: detect ID columns so they are not confused with question columns
                for c_idx, val in enumerate(row_str_cells):
                    if any(val == k or val.startswith(k) or val.endswith(" id") for k in cls.ID_HEADER_KEYWORDS) and id_col_idx == -1:
                        id_col_idx = c_idx

                # 2. Second pass: detect Question and Section columns
                for c_idx, val in enumerate(row_str_cells):
                    if c_idx == id_col_idx:
                        continue
                    if any(k == val or k in val for k in ["question", "questions", "requirement", "requirements", "prompt", "inquiry", "item description"]):
                        if q_col_idx == -1:
                            q_col_idx = c_idx
                            header_idx = r_idx
                    elif any(k in val for k in cls.QUESTION_HEADER_KEYWORDS) and not any(k in val for k in cls.ANSWER_HEADER_KEYWORDS):
                        if q_col_idx == -1:
                            q_col_idx = c_idx
                            header_idx = r_idx

                    if any(k in val for k in cls.SECTION_HEADER_KEYWORDS) and sec_col_idx == -1:
                        sec_col_idx = c_idx

                if q_col_idx != -1:
                    break

            # Fallback: if no question header found, check columns for question-like sentences (ending in ?)
            if q_col_idx == -1:
                header_idx = 0
                max_q_count = 0
                for c_idx in range(len(rows[0])):
                    q_count = sum(
                        1 for r in rows[1:30]
                        if c_idx < len(r) and r[c_idx] and ("?" in str(r[c_idx]) or len(str(r[c_idx]).split()) > 4)
                    )
                    if q_count > max_q_count:
                        max_q_count = q_count
                        q_col_idx = c_idx

            if q_col_idx == -1:
                q_col_idx = 0

            # Iterate data rows
            current_section = sheet_name
            for r_idx in range(header_idx + 1, len(rows)):
                row = rows[r_idx]
                if not row or all(c is None or str(c).strip() == "" for c in row):
                    continue

                raw_val = row[q_col_idx] if q_col_idx < len(row) else None
                q_text = str(raw_val).strip() if raw_val is not None else ""

                if not q_text or len(q_text) < 4:
                    continue

                # Check if this row is a section break header (e.g. bold or only 1 column populated)
                non_empty = [c for c in row if c is not None and str(c).strip()]
                if len(non_empty) == 1 and not q_text.endswith("?"):
                    current_section = q_text
                    sections_set.add(current_section)
                    continue

                # Section from column if available
                sec_val = row[sec_col_idx] if sec_col_idx != -1 and sec_col_idx < len(row) else None
                row_section = str(sec_val).strip() if sec_val is not None else current_section
                if row_section:
                    sections_set.add(row_section)

                # Custom ID from ID column
                id_val = row[id_col_idx] if id_col_idx != -1 and id_col_idx < len(row) else None
                custom_id = str(id_val).strip() if id_val is not None else f"{sheet_name}-R{r_idx + 1}"

                # Detect dropdown / boolean expectations
                expected_type, options = cls._infer_answer_type(q_text)

                all_questions.append(
                    ExtractedQuestion(
                        id=custom_id,
                        question_text=q_text,
                        section=row_section or sheet_name,
                        sheet_name=sheet_name,
                        row_index=r_idx + 1,
                        expected_type=expected_type,
                        options=options,
                    )
                )

        return QuestionnaireParseResult(
            filename=filename,
            format="excel",
            total_questions=len(all_questions),
            sections=sorted(list(sections_set)),
            questions=all_questions,
        )

    @classmethod
    def _parse_csv(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        text = content.decode("utf-8", errors="replace")
        delimiter = "\t" if filename.lower().endswith(".tsv") else ","
        reader = list(csv.reader(io.StringIO(text), delimiter=delimiter))

        if not reader:
            return QuestionnaireParseResult(filename=filename, format="csv", total_questions=0, sections=[], questions=[])

        header = [c.strip().lower() for c in reader[0]]
        q_idx = -1
        sec_idx = -1
        id_idx = -1

        for idx, col in enumerate(header):
            if any(k in col for k in cls.QUESTION_HEADER_KEYWORDS) and not any(k in col for k in cls.ANSWER_HEADER_KEYWORDS):
                if q_idx == -1:
                    q_idx = idx
            if any(k in col for k in cls.SECTION_HEADER_KEYWORDS) and sec_idx == -1:
                sec_idx = idx
            if any(col == k or col.startswith(k) for k in cls.ID_HEADER_KEYWORDS) and id_idx == -1:
                id_idx = idx

        if q_idx == -1:
            q_idx = 0

        questions: List[ExtractedQuestion] = []
        sections_set = set()

        for r_idx, row in enumerate(reader[1:], start=2):
            if not row or q_idx >= len(row):
                continue
            q_text = row[q_idx].strip()
            if not q_text or len(q_text) < 4:
                continue

            sec = row[sec_idx].strip() if sec_idx != -1 and sec_idx < len(row) else "General"
            sections_set.add(sec)
            qid = row[id_idx].strip() if id_idx != -1 and id_idx < len(row) else f"Q-{r_idx}"

            expected_type, options = cls._infer_answer_type(q_text)

            questions.append(
                ExtractedQuestion(
                    id=qid,
                    question_text=q_text,
                    section=sec,
                    row_index=r_idx,
                    expected_type=expected_type,
                    options=options,
                )
            )

        return QuestionnaireParseResult(
            filename=filename,
            format="csv",
            total_questions=len(questions),
            sections=sorted(list(sections_set)),
            questions=questions,
        )

    @classmethod
    def _parse_docx(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        import docx

        doc = docx.Document(io.BytesIO(content))
        questions: List[ExtractedQuestion] = []
        sections_set = set()
        current_section = "General"

        # 1. First scan tables (primary format for Word RFPs)
        for t_idx, table in enumerate(doc.tables):
            if not table.rows:
                continue

            # Identify headers from first row
            first_row = [c.text.strip().lower() for c in table.rows[0].cells]
            q_col = -1
            sec_col = -1
            id_col = -1

            for c_idx, val in enumerate(first_row):
                if any(k in val for k in cls.QUESTION_HEADER_KEYWORDS) and not any(k in val for k in cls.ANSWER_HEADER_KEYWORDS):
                    if q_col == -1:
                        q_col = c_idx
                if any(k in val for k in cls.SECTION_HEADER_KEYWORDS) and sec_col == -1:
                    sec_col = c_idx
                if any(val == k or val.startswith(k) for k in cls.ID_HEADER_KEYWORDS) and id_col == -1:
                    id_col = c_idx

            start_row = 1 if q_col != -1 else 0
            if q_col == -1:
                # Default to column with longest text
                q_col = 0
                if len(first_row) > 1 and len(table.rows) > 1:
                    q_col = 1

            for r_idx in range(start_row, len(table.rows)):
                cells = table.rows[r_idx].cells
                if q_col >= len(cells):
                    continue
                q_text = cells[q_col].text.strip()
                if not q_text or len(q_text) < 5:
                    continue

                sec = cells[sec_col].text.strip() if sec_col != -1 and sec_col < len(cells) else current_section
                sections_set.add(sec)
                qid = cells[id_col].text.strip() if id_col != -1 and id_col < len(cells) else f"T{t_idx+1}-R{r_idx+1}"

                expected_type, options = cls._infer_answer_type(q_text)

                questions.append(
                    ExtractedQuestion(
                        id=qid,
                        question_text=q_text,
                        section=sec,
                        row_index=r_idx + 1,
                        expected_type=expected_type,
                        options=options,
                    )
                )

        # 2. Paragraph scan if tables had few/no questions
        if len(questions) < 3:
            for p_idx, para in enumerate(doc.paragraphs):
                text = para.text.strip()
                if not text:
                    continue

                # Heading detection
                if para.style and "heading" in para.style.name.lower():
                    current_section = text
                    sections_set.add(current_section)
                    continue

                # Numbered or Question pattern detection
                # Matches: 1.1, 1.1.1, Q1:, Question 1:, Requirement 1:, or ends with ?
                is_question = False
                match_num = re.match(r"^(\d+[\.\d]*|[A-Z]\d+[\.\d]*|Q\d+[:\.]|Req\w*[:\.\s])\s+(.+)$", text, re.IGNORECASE)
                if match_num:
                    qid = match_num.group(1).strip(".: ")
                    q_text = match_num.group(2).strip()
                    is_question = True
                elif text.endswith("?") and len(text) > 15:
                    qid = f"P-{p_idx + 1}"
                    q_text = text
                    is_question = True

                if is_question and len(q_text) >= 5:
                    sections_set.add(current_section)
                    expected_type, options = cls._infer_answer_type(q_text)
                    questions.append(
                        ExtractedQuestion(
                            id=qid,
                            question_text=q_text,
                            section=current_section,
                            row_index=p_idx + 1,
                            expected_type=expected_type,
                            options=options,
                        )
                    )

        return QuestionnaireParseResult(
            filename=filename,
            format="word",
            total_questions=len(questions),
            sections=sorted(list(sections_set)) if sections_set else ["General"],
            questions=questions,
        )

    @classmethod
    def _parse_pdf(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        questions: List[ExtractedQuestion] = []
        sections_set = set()
        current_section = "General"

        full_text_blocks: List[str] = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            # Split into individual lines and paragraphs
            raw_lines = page_text.splitlines()
            current_block = ""
            for line in raw_lines:
                s_line = line.strip()
                if not s_line:
                    if current_block:
                        full_text_blocks.append(current_block)
                        current_block = ""
                    continue
                # If this line starts a new numbered item (e.g. "1.1", "Q1:"), flush previous block
                if re.match(r"^(\d+[\.\d]*|[A-Z]\d+[\.\d]*|Q\d+[:\.]|Req\w*[:\.\s])\s+", s_line, re.IGNORECASE):
                    if current_block:
                        full_text_blocks.append(current_block)
                    current_block = s_line
                else:
                    if current_block:
                        current_block += " " + s_line
                    else:
                        current_block = s_line
            if current_block:
                full_text_blocks.append(current_block)

        for b_idx, block in enumerate(full_text_blocks):
            # Clean up linebreaks inside block
            cleaned = re.sub(r"\s+", " ", block).strip()
            if len(cleaned) < 10:
                continue

            # Skip common PDF headers/footers
            if re.search(r"^(page\s+\d+|confidential|all rights reserved|copyright)", cleaned, re.IGNORECASE):
                continue

            # Heading detection (short, uppercase or title case, no punctuation)
            if len(cleaned.split()) <= 6 and not cleaned.endswith((".", "?", ":")) and cleaned.istitle():
                current_section = cleaned
                sections_set.add(current_section)
                continue

            is_question = False
            match_num = re.match(r"^(\d+[\.\d]*|[A-Z]\d+[\.\d]*|Q\d+[:\.]|Req\w*[:\.\s])\s+(.+)$", cleaned, re.IGNORECASE)
            if match_num:
                qid = match_num.group(1).strip(".: ")
                q_text = match_num.group(2).strip()
                is_question = True
            elif cleaned.endswith("?") and len(cleaned) > 15:
                qid = f"PDF-Q{len(questions)+1}"
                q_text = cleaned
                is_question = True

            if is_question and len(q_text) >= 5:
                sections_set.add(current_section)
                expected_type, options = cls._infer_answer_type(q_text)
                questions.append(
                    ExtractedQuestion(
                        id=qid,
                        question_text=q_text,
                        section=current_section,
                        row_index=b_idx + 1,
                        expected_type=expected_type,
                        options=options,
                    )
                )

        return QuestionnaireParseResult(
            filename=filename,
            format="pdf",
            total_questions=len(questions),
            sections=sorted(list(sections_set)) if sections_set else ["General"],
            questions=questions,
        )

    @classmethod
    def _infer_answer_type(cls, question_text: str) -> tuple[str, List[str]]:
        """
        Infers whether the questionnaire prompt expects a boolean (Yes/No),
        choice compliance rating, or free-form narrative.
        """
        lower = question_text.lower()

        # Check for binary or compliance dropdown triggers
        if re.search(r"^(do you|does your|can you|is there|are your|have you|has your|will you)\b", lower):
            return "choice", ["Yes", "No", "Partial", "N/A"]

        if any(w in lower for w in ["compliant / non-compliant", "yes/no", "yes / no", "y/n", "comply"]):
            return "choice", ["Compliant", "Partially Compliant", "Non-Compliant", "Not Applicable"]

        if re.search(r"\b(how many|what percentage|number of|rto|rpo|sla)\b", lower):
            return "numeric", []

        return "narrative", []
