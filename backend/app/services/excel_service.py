import io
import pandas as pd
import re
from typing import List, Dict, Any, AsyncGenerator, Union, Optional

class ExcelService:
    """
    Service for parsing Excel files (SIG Lite / CAIQ formats) 
    and converting them to structured data or streaming CSVs.
    """

    def __init__(self):
        # Regex to identify dangerous formula prefixes
        self.formula_prefix_pattern = re.compile(r"^[=\+\-\@\t\r]")

    def sanitize_csv_cell(self, value: Any) -> str:
        """
        Prevents CSV Formula Injection by escaping leading dangerous characters.
        """
        val_str = str(value) if value is not None else ""
        cleaned = val_str.strip()
        if self.formula_prefix_pattern.match(cleaned):
            return f"'{val_str}"
        return val_str

    async def parse_excel_buffer(self, buffer: io.BytesIO) -> pd.DataFrame:
        """
        Parses an Excel buffer into a Pandas DataFrame.
        """
        try:
            # Reset buffer position to start
            buffer.seek(0)
            df = pd.read_excel(buffer, engine='openpyxl')
            if df.empty:
                return pd.DataFrame()
            return df
        except Exception as e:
            raise ValueError(f"Failed to parse Excel buffer: {str(e)}")

    def transform_to_caiq_format(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Maps raw Excel rows into a standardized CAIQ/SIG Lite dictionary format.
        Expected columns: 'Question', 'Response', 'Implementation_Notes'
        """
        if df.empty:
            return []

        # Standardize column names to handle minor whitespace/case issues
        df.columns = [str(c).strip().replace(" ", "_").lower() for c in df.columns]
        
        results = []
        for _, row in df.iterrows():
            results.append({
                "question": row.get("question", ""),
                "response": row.get("response", ""),
                "notes": row.get("implementation_notes", "")
            })
        return results

    async def stream_dataframe_to_csv(self, df: pd.DataFrame, chunk_size: int = 100) -> AsyncGenerator[str, None]:
        """
        Memory-efficient streaming of DataFrame to CSV format.
        Yields sanitized CSV chunks.
        """
        if df.empty:
            yield ""
            return

        # Sanitize all string columns to prevent formula injection
        def sanitize_row(val):
            if isinstance(val, str):
                return self.sanitize_csv_cell(val)
            return val

        sanitized_df = df.applymap(sanitize_row)
        
        # Use a string buffer to simulate chunked streaming
        output = io.StringIO()
        
        # Write header
        sanitized_df.columns.to_csv(output, index=False)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # Write rows in chunks
        for i in range(0, len(sanitized_df), chunk_size):
            chunk = sanitized_df.iloc[i : i + chunk_size]
            chunk.to_csv(output, index=False, header=False)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)
