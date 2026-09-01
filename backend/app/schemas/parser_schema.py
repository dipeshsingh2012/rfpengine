from pydantic import BaseModel, Field
from typing import List, Optional

class SecurityControlRow(BaseModel):
    """Standardized representation of a security control from any format with strict length limits."""
    control_id: str = Field(..., max_length=100, description="The unique identifier for the control (e.g., 'AC-1')")
    question: str = Field(..., max_length=5000, description="The security question or requirement text")
    answer: str = Field(..., max_length=5000, description="The provided response or status")
    category: Optional[str] = Field(None, max_length=255, description="The domain or category (e.g., 'Access Control')")
    implementation_notes: Optional[str] = Field(None, max_length=5000, description="Additional context or implementation details")

class ParsingResult(BaseModel):
    """The final output of a parsing operation."""
    format_detected: str
    total_rows: int
    controls: List[SecurityControlRow]
