import csv
import io
import re
from typing import Any, Dict, Iterator, List, Optional, Tuple

def sanitize_excel_cell(value: Any) -> str:
    """Strip whitespace and escape formula injection characters for Excel/CSV."""
    val_str = str(value) if value is not None else ""
    cleaned = val_str.strip()
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    if cleaned.startswith(dangerous_chars):
        return f"'{val_str}"
    return val_str

def sanitize_filename_part(part: str) -> str:
    """Strictly sanitize filename part against path traversal and header splitting."""
    return re.sub(r"[^a-zA-Z0-9_-]", "", str(part).strip())

def generate_excel_csv_chunks(rows: List[Dict[str, Any]], headers: List[str]) -> Iterator[str]:
    """Memory-efficient streaming generator that yields sanitized CSV/Excel rows incrementally."""
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    
    # Write rows in chunks
    for row in rows:
        sanitized_row = [sanitize_excel_cell(row.get(h, "")) for h in headers]
        writer.writerow(sanitized_row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


import openpyxl
from app.schemas.parser_schema import SecurityControlRow

class ExcelParserService:
    FORMAT_SIGNATURES = {
        "SIG_LITE": ["Control ID", "Question", "Response"],
        "CAIQ": ["Domain", "Control", "Question", "Response"],
    }

    def sanitize_csv_cell(self, value: Any) -> str:
        return sanitize_excel_cell(value)

    def _read_table(self, file_content: bytes, filename: str) -> Tuple[List[str], List[Dict[str, Any]]]:
        headers: List[str] = []
        records: List[Dict[str, Any]] = []
        if filename.endswith(".csv"):
            text = file_content.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(text))
            for i, row in enumerate(reader):
                if i == 0:
                    headers = [str(c).strip() for c in row]
                else:
                    rec = {headers[j]: row[j] for j in range(min(len(headers), len(row)))}
                    records.append(rec)
        else:
            wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
            ws = wb.active
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0:
                    headers = [str(c).strip() for c in row if c is not None]
                else:
                    rec = {headers[j]: row[j] for j in range(min(len(headers), len(row))) if row[j] is not None}
                    if rec:
                        records.append(rec)
        return headers, records

    def _detect_format(self, headers: List[str]) -> str:
        header_set = set(headers)
        for fmt, sig in self.FORMAT_SIGNATURES.items():
            if all(s in header_set for s in sig):
                return fmt
        return "GENERIC"

    def parse_buffer(self, file_content: bytes, filename: str, tenant_id: Optional[str] = None) -> Tuple[str, List[SecurityControlRow]]:
        if not filename.endswith(('.csv', '.xlsx', '.xls')):
            raise ValueError("Unsupported file extension. Please upload .csv, .xlsx, or .xls")

        headers, records = self._read_table(file_content, filename)
        if not records:
            return "EMPTY", []

        fmt = self._detect_format(headers)
        controls = self._map_to_schema(records, headers, fmt)
        return fmt, controls

    def _map_to_schema(self, records: List[Dict[str, Any]], headers: List[str], fmt: str) -> List[SecurityControlRow]:
        rows: List[SecurityControlRow] = []
        for row in records:
            try:
                if fmt == "SIG_LITE":
                    control = SecurityControlRow(
                        control_id=str(self.sanitize_csv_cell(row.get("Control ID", "N/A"))),
                        question=str(self.sanitize_csv_cell(row.get("Question", "N/A"))),
                        answer=str(self.sanitize_csv_cell(row.get("Response", ""))),
                        category=None,
                        implementation_notes=None
                    )
                elif fmt == "CAIQ":
                    control = SecurityControlRow(
                        control_id=str(self.sanitize_csv_cell(row.get("Control", "N/A"))),
                        question=str(self.sanitize_csv_cell(row.get("Question", "N/A"))),
                        answer=str(self.sanitize_csv_cell(row.get("Response", ""))),
                        category=str(self.sanitize_csv_cell(row.get("Domain", ""))),
                        implementation_notes=None
                    )
                else:
                    col_keys = {c.lower(): c for c in headers}
                    c_id = row.get(col_keys.get("id", col_keys.get("control_id", col_keys.get("control id", ""))), "N/A")
                    c_q = row.get(col_keys.get("question", col_keys.get("query", col_keys.get("text", ""))), "N/A")
                    c_a = row.get(col_keys.get("answer", col_keys.get("response", "")), "")
                    c_cat = row.get(col_keys.get("category", col_keys.get("domain", "")), None)
                    control = SecurityControlRow(
                        control_id=str(self.sanitize_csv_cell(c_id)),
                        question=str(self.sanitize_csv_cell(c_q)),
                        answer=str(self.sanitize_csv_cell(c_a)),
                        category=str(self.sanitize_csv_cell(c_cat)) if c_cat is not None else None,
                        implementation_notes=None
                    )
                rows.append(control)
            except Exception:
                continue
        return rows
