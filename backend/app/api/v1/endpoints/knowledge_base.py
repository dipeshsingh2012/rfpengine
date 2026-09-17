from fastapi import APIRouter, Header, HTTPException
from app.services.kb_service import kb_service, KBDocument
from typing import Optional

router = APIRouter()

@router.post("/{doc_id}")
async def upsert_doc(doc_id: str, doc: KBDocument, x_tenant_id: str = Header(...)):
    return await kb_service.upsert_document(x_tenant_id, doc)

@router.get("/{doc_id}", response_model=KBDocument)
async def get_doc(doc_id: str, x_tenant_id: str = Header(...)):
    doc = await kb_service.get_document(x_tenant_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{doc_id}")
async def delete_doc(doc_id: str, x_tenant_id: str = Header(...)):
    if not await kb_service.delete_document(x_tenant_id, doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted"}
