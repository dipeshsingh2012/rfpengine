from fastapi import APIRouter, UploadFile, File, HTTPException, status, Header, Depends
from app.services.excel_service import ExcelParserService
from app.schemas.parser_schema import ParsingResult
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)
parser_service = ExcelParserService()

# Security Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit to prevent DoS
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}

async def get_current_tenant(x_tenant_id: str = Header(alias="X-Tenant-ID")) -> str:
    """Dependency to validate tenant context."""
    if not x_tenant_id or len(x_tenant_id.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid X-Tenant-ID header."
        )
    return x_tenant_id.strip()

@router.post("/upload", response_model=ParsingResult)
async def upload_parser_file(
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_current_tenant)
):
    """
    Upload an Excel or CSV file to be parsed into standardized security controls.
    """
    # 1. Validate File Extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"
        )

    # 2. Prevent DoS via Memory Exhaustion (Check file size)
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    try:
        # 3. Read content into memory
        content = await file.read()
        
        # 4. Parse via service (Passing tenant_id to resolve isolation leak)
        detected_fmt, controls = parser_service.parse_buffer(content, file.filename, tenant_id)

        return ParsingResult(
            format_detected=detected_fmt,
            total_rows=len(controls),
            controls=controls
        )

    except ValueError as ve:
        # Catch dimension/size errors from service
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Parsing error for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the file."
        )
