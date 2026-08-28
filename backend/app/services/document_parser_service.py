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
    Parses various document formats (CSV, TSV, JSON, JSONL, PDF, DOCX, Markdown, TXT)
    into structured KBEntryCreate objects with optimal 300-500 token chunking for vector search.
    """

    CHUNK_SIZE_CHARS = 1600  # ~400 tokens
    CHUNK_OVERLAP_CHARS = 200  # ~50 tokens

    @classmethod
    def parse_document(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str = "acme-corp",
        default_category: Optional[str] = None,
    ) -> List[KBEntryCreate]:
        lower_name = filename.lower()

        if lower_name.endswith(".csv") or lower_name.endswith(".tsv"):
            return cls._parse_tabular(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".json") or lower_name.endswith(".jsonl"):
            return cls._parse_json(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".pdf"):
            return cls._parse_pdf(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".docx"):
            return cls._parse_docx(content, filename, tenant_id, default_category)
        elif lower_name.endswith(".md") or lower_name.endswith(".markdown"):
            return cls._parse_markdown(content, filename, tenant_id, default_category)
        else:
            # Fallback to plain text parser
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

            # Normalize keys to lowercase for flexible column mapping
            norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k and v}

            # Find Question
            question = (
                norm_row.get("question")
                or norm_row.get("prompt")
                or norm_row.get("q")
                or norm_row.get("inquiry")
                or norm_row.get("topic")
                or norm_row.get("requirement")
            )

            # Find Answer
            answer = (
                norm_row.get("answer")
                or norm_row.get("response")
                or norm_row.get("a")
                or norm_row.get("content")
                or norm_row.get("text")
                or norm_row.get("details")
            )

            # Find Category
            category = (
                norm_row.get("category")
                or norm_row.get("section")
                or norm_row.get("domain")
                or norm_row.get("tag")
                or default_category
                or "General"
            )

            if question and answer:
                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        question=question,
                        answer=answer,
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

    # --- 2. JSON / JSONL Parser ---
    @classmethod
    def _parse_json(
        cls,
        content: bytes,
        filename: str,
        tenant_id: str,
        default_category: Optional[str],
    ) -> List[KBEntryCreate]:
        text_content = content.decode("utf-8-sig", errors="replace")
        entries: List[KBEntryCreate] = []

        try:
            # Try standard JSON parse first
            data = json.loads(text_content)
            items = data if isinstance(data, list) else data.get("items", data.get("records", [data]))
        except json.JSONDecodeError:
            # Try JSONL line by line
            items = []
            for line in text_content.splitlines():
                line = line.strip()
                if line:
                    try:
                        items.append(json.loads(line))
                    except Exception:
                        continue

        for idx, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                continue
            question = item.get("question") or item.get("prompt") or item.get("topic") or item.get("q")
            answer = item.get("answer") or item.get("response") or item.get("content") or item.get("text") or item.get("a")
            category = item.get("category") or item.get("section") or default_category or "General"

            if question and answer:
                meta = item.get("metadata", {})
                meta["source_file"] = filename
                meta["item_index"] = idx
                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        question=str(question).strip(),
                        answer=str(answer).strip(),
                        category=str(category).strip(),
                        metadata=meta,
                    )
                )

        logger.info("Parsed %d entries from JSON file '%s'", len(entries), filename)
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
        # Split by markdown headers (# Header 1, ## Header 2, ### Header 3)
        heading_pattern = re.compile(r"^(#{1,4}\s+.+)$", re.MULTILINE)
        splits = heading_pattern.split(text_content)

        entries: List[KBEntryCreate] = []
        current_heading = default_category or "Overview"

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
                    question_title = f"{current_heading} (Part {chunk_idx})" if len(chunks) > 1 else current_heading
                    entries.append(
                        KBEntryCreate(
                            tenant_id=tenant_id,
                            question=question_title,
                            answer=chunk,
                            category=default_category or "Policy & Documentation",
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

                # Extract first sentence or phrase as topical prompt
                first_period = chunk.find(". ")
                topic_snippet = chunk[:first_period].strip() if 10 < first_period < 120 else chunk[:80].strip()
                question = f"{base_name} - Page {page_num}: {topic_snippet}..."

                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        question=question,
                        answer=chunk,
                        category=default_category or "Compliance & Security",
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
        current_heading = default_category or filename.rsplit(".", 1)[0]
        current_buffer = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            if p.style.name.startswith("Heading"):
                # Flush previous buffer if populated
                if current_buffer:
                    full_text = " ".join(current_buffer)
                    chunks = cls._chunk_text(full_text, cls.CHUNK_SIZE_CHARS, cls.CHUNK_OVERLAP_CHARS)
                    for c_idx, chunk in enumerate(chunks, start=1):
                        entries.append(
                            KBEntryCreate(
                                tenant_id=tenant_id,
                                question=f"{current_heading} (Part {c_idx})" if len(chunks) > 1 else current_heading,
                                answer=chunk,
                                category=default_category or "Documentation",
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
                entries.append(
                    KBEntryCreate(
                        tenant_id=tenant_id,
                        question=f"{current_heading} (Part {c_idx})" if len(chunks) > 1 else current_heading,
                        answer=chunk,
                        category=default_category or "Documentation",
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
            entries.append(
                KBEntryCreate(
                    tenant_id=tenant_id,
                    question=f"{base_name} ({snippet})",
                    answer=chunk,
                    category=default_category or "Knowledge Base",
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

            # Try to break on paragraph or sentence boundary
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

