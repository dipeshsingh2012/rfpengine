from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from opensearchpy._async.client import AsyncOpenSearch
from pydantic import BaseModel, Field


INDEX_NAME = "rfq_knowledge_base"


class SearchRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)


class Source(BaseModel):
    id: str
    question: str
    answer: str
    score: float


class SearchResponse(BaseModel):
    suggested_answer: str
    confidence_score: float = Field(ge=0, le=1)
    sources: list[Source]


def create_opensearch_client() -> AsyncOpenSearch:
    return AsyncOpenSearch(
        hosts=[os.getenv("OPENSEARCH_URL", "http://localhost:9200")],
        http_auth=(
            os.getenv("OPENSEARCH_USERNAME", "admin"),
            os.getenv("OPENSEARCH_PASSWORD", "admin"),
        ),
        use_ssl=os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true",
        verify_certs=os.getenv("OPENSEARCH_VERIFY_CERTS", "false").lower() == "true",
    )


def create_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.opensearch = create_opensearch_client()
    app.state.openai = create_openai_client() if os.getenv("OPENAI_API_KEY") else None
    yield
    await app.state.opensearch.close()


app = FastAPI(title="RFQEngine API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"chrome-extension://.*"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def reciprocal_rank_fusion(result_sets: list[list[dict[str, Any]]], limit: int) -> list[dict[str, Any]]:
    fused: dict[str, dict[str, Any]] = {}
    for results in result_sets:
        for rank, hit in enumerate(results, start=1):
            document_id = hit["_id"]
            entry = fused.setdefault(document_id, {"hit": hit, "score": 0.0})
            entry["score"] += 1 / (60 + rank)
    return sorted(fused.values(), key=lambda item: item["score"], reverse=True)[:limit]


async def retrieve_sources(client: AsyncOpenSearch, request: SearchRequest, embedding: list[float]) -> list[dict[str, Any]]:
    tenant_filter = {"term": {"tenant_id": request.tenant_id}}
    sparse = await client.search(
        index=INDEX_NAME,
        body={
            "size": request.top_k,
            "query": {"bool": {"filter": [tenant_filter], "must": {"match": {"question": request.question}}}},
        },
    )
    dense = await client.search(
        index=INDEX_NAME,
        body={
            "size": request.top_k,
            "query": {"knn": {"question_vector": {"vector": embedding, "k": request.top_k, "filter": tenant_filter}}},
        },
    )
    return reciprocal_rank_fusion(
        [sparse["hits"]["hits"], dense["hits"]["hits"]], request.top_k
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    if app.state.openai is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")

    try:
        embedding_response = await app.state.openai.embeddings.create(
            model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
            input=request.question,
        )
        fused_results = await retrieve_sources(
            app.state.opensearch, request, embedding_response.data[0].embedding
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Search backend unavailable") from exc

    sources = [
        Source(
            id=item["hit"]["_id"],
            question=item["hit"]["_source"].get("question", ""),
            answer=item["hit"]["_source"].get("answer", ""),
            score=round(item["score"], 6),
        )
        for item in fused_results
    ]
    context = "\n\n".join(f"Source {source.id}: Q: {source.question}\nA: {source.answer}" for source in sources)
    prompt = (
        "Draft a concise answer to the user's question using only the supplied sources. "
        "If the sources do not support an answer, say that clearly. Do not invent facts.\n\n"
        f"User question: {request.question}\n\nSources:\n{context or 'No sources found.'}"
    )
    try:
        completion = await app.state.openai.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o"),
            temperature=0,
            messages=[
                {"role": "system", "content": "You are an exacting RFP response assistant. Return only the drafted answer."},
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Answer generation unavailable") from exc

    confidence = min(1.0, max((source.score for source in sources), default=0.0) * 60)
    return SearchResponse(
        suggested_answer=completion.choices[0].message.content or "",
        confidence_score=round(confidence, 4),
        sources=sources,
    )
