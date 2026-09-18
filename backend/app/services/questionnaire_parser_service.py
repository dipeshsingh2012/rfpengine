from __future__ import annotations

import csv
import io
import json
import logging
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
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

    IMPERATIVE_VERBS_RE = re.compile(
        r"^(?:please\s+)?(describe|provide|explain|detail|outline|list|confirm|specify|"
        r"demonstrate|clarify|state|identify|indicate|discuss|summarize|ensure|verify|"
        r"define|document|note|submit|attach|certify|validate)\b",
        re.IGNORECASE,
    )

    OBLIGATION_RE = re.compile(
        r"\b(vendor|contractor|bidder|supplier|provider|organization|system|platform|solution|application)\s+"
        r"(?:must|shall|should|will|is required to|needs to|agrees to)\b|"
        r"\b(?:must|shall|should)\s+(?:be supported|be provided|be implemented|comply|adhere|maintain|enforce)\b",
        re.IGNORECASE,
    )

    INTERROGATIVE_STARTERS_RE = re.compile(
        r"^(how|what|where|when|why|who|which|can|could|do|does|is|are|will|would|have|has|should)\b",
        re.IGNORECASE,
    )

    PREFIX_PATTERNS = [
        re.compile(r"^([A-Z]{2,10}[-_ ]\d+(?:\.\d+)*)[:\.\s\-]+(.*)$", re.IGNORECASE),
        re.compile(r"^(Q(?:uestion)?\s*#?\d+(?:\.\d+)*)[:\.\s\-]+(.*)$", re.IGNORECASE),
        re.compile(r"^(Req(?:uirement)?\s*#?\d+(?:\.\d+)*)[:\.\s\-]+(.*)$", re.IGNORECASE),
        re.compile(r"^(\d+(?:\.\d+)+)[:\.\s\-]+(.*)$"),
        re.compile(r"^(\d+[\.\)])\s+(.*)$"),
        re.compile(r"^(\([a-zA-Z0-9]+\)|\[\d+\])\s+(.*)$"),
    ]

    BULLET_RE = re.compile(r"^[\u2022\u25cf\u25aa\u25ab\x7f\*\-\–\—]\s*|^o\s+")

    PAGE_HEADER_FOOTER_RE = re.compile(
        r"^(page\s+\d+|table of contents|confidential|copyright|all rights reserved|rfp\s+version)",
        re.IGNORECASE,
    )

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
    def is_question_or_requirement(cls, text: str) -> Tuple[bool, Optional[str], str]:
        """
        Evaluates whether a line or block represents an RFP question or requirement.
        Detects:
        - Interrogatives (ending in '?' or starting with question words)
        - Imperative directives ('Describe...', 'Provide...', 'Explain...', 'Confirm...')
        - Obligation clauses ('Vendor must...', 'Contractor shall...')
        - Numbered / prefixed items (SEC-01, 1.1, Q-1)
        Returns (is_question, detected_id, clean_prompt_text).
        """
        raw = text.strip()
        if len(raw) < 5:
            return False, None, raw

        # Strip bullet points
        s = cls.BULLET_RE.sub("", raw).strip()

        # Check for header/footer noise
        if cls.PAGE_HEADER_FOOTER_RE.search(s):
            return False, None, s

        # Check for ID prefixes
        detected_id: Optional[str] = None
        for pat in cls.PREFIX_PATTERNS:
            m = pat.match(s)
            if m:
                detected_id = m.group(1).strip(".:- ")
                s = m.group(2).strip()
                break

        # Check if s is purely a section heading like "Section 1: Data Encryption"
        if re.search(r"^(?:section|module|category|pillar|part|chapter)\s+[\dA-Z]+[:\.\s\-]+", s, re.IGNORECASE):
            return False, None, s

        is_match = False
        if s.endswith("?"):
            is_match = True
        elif cls.IMPERATIVE_VERBS_RE.search(s):
            is_match = True
        elif cls.OBLIGATION_RE.search(s):
            is_match = True
        elif cls.INTERROGATIVE_STARTERS_RE.search(s) and len(s) >= 12:
            is_match = True
        elif detected_id and len(s) >= 15:
            is_match = True

        return is_match, detected_id, s if is_match else raw

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

                # Numbered, Question, Imperative, or Obligation pattern detection
                is_question, qid, prompt = cls.is_question_or_requirement(text)

                if is_question and len(prompt) >= 5:
                    sections_set.add(current_section)
                    expected_type, options = cls._infer_answer_type(prompt)
                    questions.append(
                        ExtractedQuestion(
                            id=qid or f"P-{p_idx + 1}",
                            question_text=prompt,
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
    def _get_genai_client(cls) -> Optional[Any]:
        """
        Initializes Google Cloud Vertex AI / Gemini API client if credentials are configured.
        """
        try:
            from google import genai
            from google.oauth2 import service_account
            from app.core.config import settings

            if not settings.gcp_project_id or settings.gcp_project_id == "test-project-id":
                if os.environ.get("GEMINI_API_KEY"):
                    try:
                        return genai.Client(api_key=os.environ["GEMINI_API_KEY"])
                    except Exception:
                        pass
                return None

            creds_path = settings.google_application_credentials
            credentials = None
            if creds_path:
                path_obj = Path(creds_path)
                if not path_obj.is_absolute():
                    if not path_obj.exists() and (Path.cwd() / creds_path).exists():
                        path_obj = Path.cwd() / creds_path
                    elif not path_obj.exists() and (Path.cwd().parent / creds_path).exists():
                        path_obj = Path.cwd().parent / creds_path
                if path_obj.exists():
                    credentials = service_account.Credentials.from_service_account_file(
                        str(path_obj.resolve()),
                        scopes=["https://www.googleapis.com/auth/cloud-platform"],
                    )

            return genai.Client(
                vertexai=True,
                project=settings.gcp_project_id,
                location=settings.GCP_REGION,
                credentials=credentials,
            )
        except Exception as exc:
            logger.debug("Could not initialize genai client for questionnaire parser: %s", exc)
            return None

    @classmethod
    def _parse_pdf_with_gemini(cls, raw_text: str, filename: str) -> Optional[QuestionnaireParseResult]:
        """
        Uses Gemini 2.5 Flash with structured JSON output to extract all questions,
        sections, and answer types with deep semantic understanding.
        """
        client = cls._get_genai_client()
        if not client:
            return None

        try:
            from google.genai import types
            from app.core.config import settings

            prompt = (
                "You are an expert Enterprise RFP & Compliance Questionnaire Parser.\n"
                "Extract every question, technical requirement, inquiry, specification, and compliance item from the following document text.\n"
                "Extract both interrogative questions (ending in '?') and imperative requirements (e.g. 'Describe your disaster recovery process', 'Provide proof of SOC 2 certification', 'Vendor must encrypt data at rest', 'Explain your access revocation timeline').\n"
                "Also identify the section or topic heading each requirement belongs to.\n\n"
                "Return a valid JSON array of objects with the exact structure:\n"
                "[\n"
                "  {\n"
                '    "id": "SEC-01",\n'
                '    "question_text": "Describe your data encryption methods for data at rest and in transit.",\n'
                '    "section": "Data Protection",\n'
                '    "expected_type": "narrative",\n'
                '    "options": []\n'
                "  }\n"
                "]\n\n"
                f"Document Text:\n{raw_text[:35000]}"
            )

            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            if not response or not response.text:
                return None

            data = json.loads(response.text)
            if isinstance(data, dict) and "questions" in data:
                data = data["questions"]
            if not isinstance(data, list) or len(data) == 0:
                return None

            questions: List[ExtractedQuestion] = []
            sections_set = set()

            for idx, item in enumerate(data, start=1):
                if not isinstance(item, dict):
                    continue
                q_text = str(item.get("question_text") or item.get("question") or "").strip()
                if not q_text or len(q_text) < 4:
                    continue
                qid = str(item.get("id") or f"PDF-Q{idx}").strip()
                sec = str(item.get("section") or "General").strip()
                exp_type = str(item.get("expected_type") or "narrative").strip().lower()
                if exp_type not in ("narrative", "choice", "numeric", "boolean"):
                    exp_type = "narrative"
                options = [str(o) for o in item.get("options", []) if str(o).strip()]

                sections_set.add(sec)
                questions.append(
                    ExtractedQuestion(
                        id=qid,
                        question_text=q_text,
                        section=sec,
                        row_index=idx,
                        expected_type=exp_type,
                        options=options,
                    )
                )

            if len(questions) > 0:
                logger.info(
                    "Gemini 2.5 Flash extracted %d questions from PDF %s across %d sections",
                    len(questions),
                    filename,
                    len(sections_set),
                )
                return QuestionnaireParseResult(
                    filename=filename,
                    format="pdf",
                    total_questions=len(questions),
                    sections=sorted(list(sections_set)) if sections_set else ["General"],
                    questions=questions,
                )
        except Exception as exc:
            logger.warning(
                "Gemini 2.5 Flash PDF extraction failed (%s); falling back to heuristic engine",
                exc,
            )
            return None
        return None

    @classmethod
    def _parse_pdf_heuristics(cls, page_texts: List[str], filename: str) -> QuestionnaireParseResult:
        """
        Resilient heuristic parsing engine for PDFs:
        - Multi-column table layout decomposition
        - Imperative requirements, obligation statements, and interrogatives
        - Line-wrap and paragraph continuation stitching
        """
        questions: List[ExtractedQuestion] = []
        sections_set = set()
        current_section = "General"

        for page_str in page_texts:
            raw_lines = page_str.splitlines()
            l_idx = 0
            while l_idx < len(raw_lines):
                line = raw_lines[l_idx].strip()
                l_idx += 1
                if not line:
                    continue

                if cls.PAGE_HEADER_FOOTER_RE.search(line):
                    continue

                # Section Heading Detection (e.g. "Section 1: Data Encryption", "2.0 Access Control")
                sec_match = re.match(
                    r"^(?:section|part|category|module|pillar)\s+[\dA-Z]+[:\.\s\-]+(.*)$",
                    line,
                    re.IGNORECASE,
                )
                if sec_match:
                    current_section = sec_match.group(1).strip() or line
                    sections_set.add(current_section)
                    continue

                if (
                    len(line.split()) <= 6
                    and not line.endswith((".", "?", ":", ";"))
                    and (line.isupper() or line.istitle())
                    and not any(
                        line.lower().startswith(v)
                        for v in [
                            "describe", "provide", "explain", "detail", "list",
                            "confirm", "vendor", "do", "does", "what", "how", "is"
                        ]
                    )
                ):
                    current_section = line
                    sections_set.add(current_section)
                    continue

                # Table line detection with column separators (tabs, pipes, 3+ spaces)
                table_parts = [p.strip() for p in re.split(r"\s{3,}|\t|\|", line) if p.strip()]
                if len(table_parts) >= 2:
                    part0_is_id = any(pat.match(table_parts[0]) for pat in cls.PREFIX_PATTERNS) or bool(
                        re.match(r"^[A-Z0-9\.\-_]{1,10}$", table_parts[0])
                    )
                    if part0_is_id and len(table_parts) >= 3:
                        qid = table_parts[0]
                        sec = table_parts[1]
                        prompt = table_parts[2]
                        matched, _, clean_p = cls.is_question_or_requirement(prompt)
                        if matched or len(prompt) >= 10:
                            sections_set.add(sec)
                            expected_type, options = cls._infer_answer_type(clean_p or prompt)
                            last_col = table_parts[-1].lower()
                            if any(w in last_col for w in ["yes", "no", "comply", "compliant", "n/a"]):
                                expected_type = "choice"
                                options = ["Compliant", "Partially Compliant", "Non-Compliant", "Not Applicable"]
                            questions.append(
                                ExtractedQuestion(
                                    id=qid,
                                    question_text=clean_p or prompt,
                                    section=sec,
                                    row_index=len(questions) + 1,
                                    expected_type=expected_type,
                                    options=options,
                                )
                            )
                            continue
                    elif part0_is_id and len(table_parts) == 2:
                        qid = table_parts[0]
                        prompt = table_parts[1]
                        matched, _, clean_p = cls.is_question_or_requirement(prompt)
                        if matched or len(prompt) >= 10:
                            sections_set.add(current_section)
                            expected_type, options = cls._infer_answer_type(clean_p or prompt)
                            questions.append(
                                ExtractedQuestion(
                                    id=qid,
                                    question_text=clean_p or prompt,
                                    section=current_section,
                                    row_index=len(questions) + 1,
                                    expected_type=expected_type,
                                    options=options,
                                )
                            )
                            continue

                # Standard line question/requirement check
                matched, qid, prompt = cls.is_question_or_requirement(line)
                if matched:
                    comb = prompt
                    # Stitch wrapped lines continuing this question
                    while l_idx < len(raw_lines):
                        nxt = raw_lines[l_idx].strip()
                        if not nxt:
                            break
                        if cls.PAGE_HEADER_FOOTER_RE.search(nxt):
                            break
                        nxt_matched, nxt_qid, _ = cls.is_question_or_requirement(nxt)
                        if nxt_qid:
                            break
                        # If current prompt didn't end with sentence punctuation or next starts lowercase
                        if not comb.rstrip().endswith((".", "?", "!", ":")) or (nxt and nxt[0].islower()):
                            comb += " " + nxt
                            l_idx += 1
                            if nxt.endswith((".", "?", "!")):
                                break
                        else:
                            break

                    item_id = qid or f"PDF-Q{len(questions) + 1}"
                    sections_set.add(current_section)
                    expected_type, options = cls._infer_answer_type(comb)
                    questions.append(
                        ExtractedQuestion(
                            id=item_id,
                            question_text=comb,
                            section=current_section,
                            row_index=len(questions) + 1,
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
    def _parse_pdf(cls, content: bytes, filename: str) -> QuestionnaireParseResult:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        page_texts = [(page.extract_text() or "") for page in reader.pages]
        combined_text = "\n\n".join(page_texts).strip()

        # 1. Attempt Gemini 2.5 Flash semantic structured extraction
        gemini_result = cls._parse_pdf_with_gemini(combined_text, filename)
        if gemini_result and gemini_result.total_questions > 0:
            return gemini_result

        # 2. Resilient multi-pass heuristic engine fallback
        return cls._parse_pdf_heuristics(page_texts, filename)

    @classmethod
    def _infer_answer_type(cls, question_text: str) -> tuple[str, List[str]]:
        """
        Infers whether the questionnaire prompt expects a boolean (Yes/No),
        choice compliance rating, or free-form narrative.
        """
        lower = question_text.lower()

        # Check for binary or compliance dropdown triggers
        if re.search(r"^(do you|does your|can you|is there|are your|have you|has your|will you|confirm whether|confirm if)\b", lower):
            return "choice", ["Yes", "No", "Partial", "N/A"]

        if any(w in lower for w in ["compliant / non-compliant", "yes/no", "yes / no", "y/n", "comply", "compliance status"]):
            return "choice", ["Compliant", "Partially Compliant", "Non-Compliant", "Not Applicable"]

        if re.search(r"\b(how many|what percentage|number of|rto|rpo|sla|latency|hours|days|retention period)\b", lower):
            return "numeric", []

        return "narrative", []
