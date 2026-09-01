from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.excel_service import ExcelParserService
from app.schemas.parser_schema import ParsingResult
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
parser_service = ExcelParserService()

@router.post("/upload", response_model=ParsingResult)
async def upload_parser_file(file: UploadFile = File(...)):
    """
    Upload an Excel or CSV file (SIG Lite, CAIQ, or Generic) 
    to be parsed into standardized security controls.
    """
    # 1. Validate File Extension
    allowed_extensions = {'.csv', '.xlsx', '.xls'}
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {allowed_extensions}"
        )

    try:
        # 2. Read content into memory
        content = await file.read()
        
        # 3. Parse via service
        controls = parser_service.parse_buffer(content, file.filename)
        
        # 4. Detect format for the response (re-running detection logic or passing it back)
        # For simplicity in this implementation, we re-detect or infer
        # In a production system, parse_buffer would return (fmt, controls)
        import pandas as pd
        import io
        df = pd.read_csv(io.BytesIO(content)) if ext == '.csv' else pd.read_excel(io.BytesIO(content))
        detected_fmt = parser_service._detect_format(df)

        return ParsingResult(
            format_detected=detected_fmt,
            total_rows=len(controls),
            controls=controls
        )

    except Exception as e:
        logger.error(f"Parsing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the file."
        )
