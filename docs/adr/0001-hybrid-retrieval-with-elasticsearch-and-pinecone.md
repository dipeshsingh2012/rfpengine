# ADR 0001: Hybrid Search with Elasticsearch (Sparse BM25) and Pinecone (Dense Vector) via Reciprocal Rank Fusion

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

In enterprise Request for Proposal (RFP) questionnaires, questions vary dramatically in syntax and terminology:
1. **Keyword-specific queries**: Questions containing exact compliance identifiers, acronyms, standard clauses, or product SKUs (e.g., "SOC 2 Type II", "AES-256", "TLS 1.3", "GDPR Article 28", "FedRAMP Moderate").
2. **Semantic / conceptual queries**: Questions using colloquial or varied phrasing for which exact keyword matching fails (e.g., "How do you protect customer data when shutting down an account?" vs "Data retention and deletion schedule").

Relying solely on dense vector embeddings often loses precision on exact keyword matches, identifiers, and alphanumeric codes. Relying solely on BM25 sparse search fails to capture semantic meaning and synonyms.

## Decision

We adopt a **Hybrid Retrieval Architecture** combining:
1. **Elasticsearch / Elastic Cloud (Sparse / BM25)**:
   - Supports self-hosted Elasticsearch and managed **Elastic Cloud** deployments (via `ELASTICSEARCH_API_KEY`, `ELASTIC_CLOUD_ID`, or HTTPS `ELASTICSEARCH_URL` with SSL verification).
   - Uses `elasticsearch.helpers.async_bulk` for high-throughput multi-document ingestion.
   - Indexes `tenant_id`, `question`, `answer`, `category`, and nested citation `metadata`.
   - Performs BM25 keyword matching with query boosting on question fields and tenant filtering.
2. **Pinecone (Dense / Vector k-NN)**:
   - Uses modern Pinecone SDK v5 with **Serverless** index auto-provisioning (`ServerlessSpec(cloud="aws", region="us-east-1")`).
   - Indexes 768-dimensional embeddings generated with **Google Cloud Vertex AI** (`text-embedding-004`) or 1,536-dimensional embeddings with OpenAI (`text-embedding-3-small`) in single-request batch calls.
   - Performs cosine similarity search with tenant metadata filtering (`{"tenant_id": {"$eq": tenant_id}}`).
3. **Reciprocal Rank Fusion (RRF)**:
   - Merges ranked lists from both retrievers using the formula:
     $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k=60)$$
   - Grounded context from top-ranked fused documents is passed to **Vertex AI Gemini 2.5 Flash** (or OpenAI `gpt-4o`) for strict, hallucination-free response drafting.
4. **Diagnostics & Cloud Health Tooling**:
   - Automated CLI diagnostics script (`backend/scripts/verify_cloud_connections.py`) and FastAPI `/health` endpoint validating live health, version, latency, and index readiness across PostgreSQL (Neon), Elastic Cloud, Pinecone Serverless, and Google Cloud Vertex AI.

## Consequences

### Positive
- **High precision and recall**: Captures both exact regulatory/technical keywords and semantic concepts.
- **Enterprise Cloud Ready**: Zero-code friction switching between local Docker containers and production Elastic Cloud & Pinecone Serverless clusters.
- **High-Performance Ingestion**: Batched OpenAI embeddings (`generate_embeddings_batch`) combined with Elasticsearch `async_bulk` and Pinecone bulk upserts reduce document upload latency from $O(N)$ HTTP roundtrips to $O(1)$.
- **Resilience**: If either retriever experiences high latency or degraded state, results can still be served from the available retriever.
- **Tenant isolation**: Enforces tenant-level isolation across both Elasticsearch queries and Pinecone metadata filters.
- **Grounded LLM context**: Provides citations with source IDs, source file names, page numbers, and retriever origin tags.

### Negative / Trade-offs
- Requires maintaining and synchronizing credentials for two search systems alongside the primary database.
- Batch upserts and deletes must update both Elasticsearch and Pinecone.

