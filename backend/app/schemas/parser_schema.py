from pydantic import BaseModel, Field
from typing import List, Optional

class SecurityControlRow(BaseModel):
    """Standardized representation of a security control from any format."""
    control_id: str = Field(..., description="The unique identifier for the control (e.g., 'AC-1')")
    question: str = Field(..., description="The security question or requirement text")
    answer: str = Field(..., description="The provided response or status")
    category: Optional[str] = Field(None, description="The domain or category (e.g., 'Access Control')")
    implementation_notes: Optional[str] = Field(None, description="Additional context or implementation details")

class ParsingResult(BaseModel):
    """The final output of a parsing operation."""
    format_detected: str
    total_rows: int
    controls: List[SecurityControlRow]
