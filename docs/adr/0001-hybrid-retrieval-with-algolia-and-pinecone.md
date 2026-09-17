# ADR 0001: Hybrid Search with Algolia (Sparse) and Pinecone (Dense Vector) via Reciprocal Rank Fusion

* **Status**: Accepted
* **Date**: 2026-08-28 (Updated 2026-09-17)
* **Deciders**: Engineering Team

## Context

In enterprise Request for Proposal (RFP) questionnaires, questions vary dramatically in syntax and terminology:
1. **Keyword-specific queries**: Questions containing exact compliance identifiers, acronyms, standard clauses, or product SKUs (e.g., "SOC 2 Type II", "AES-256", "TLS 1.3", "GDPR Article 28", "FedRAMP Moderate").
2. **Semantic / conceptual queries**: Questions using colloquial or varied phrasing for which exact keyword matching fails (e.g., "How do you protect customer data when shutting down an account?" vs "Data retention and deletion schedule").

Relying solely on dense vector embeddings often loses precision on exact keyword matches, identifiers, and alphanumeric codes. Relying solely on sparse search fails to capture semantic meaning and synonyms.

## Decision

We adopt a **Hybrid Retrieval Architecture** combining:
1. **Algolia (Sparse / Keyword Match)**:
   - Uses managed **Algolia Cloud** index (`ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX_NAME`).
   - Uses high-throughput batching for multi-document ingestion.
   - Indexes `tenant_id`, `title`, `content`, `question`, `answer`, `category`, and nested citation `metadata`.
   - Performs keyword matching with searchable attribute rankings and `tenant_id` facet filtering.
2. **Pinecone (Dense / Vector k-NN)**:
   - Uses modern Pinecone SDK v5 with **Serverless** index auto-provisioning (`ServerlessSpec(cloud="aws", region="us-east-1")`).
   - Indexes 768-dimensional embeddings generated with **Google Cloud Vertex AI** (`text-embedding-004`) in single-request batch calls.
   - Performs cosine similarity search with tenant metadata filtering (`{"tenant_id": {"$eq": tenant_id}}`).
3. **Reciprocal Rank Fusion (RRF)**:
   - Merges ranked lists from both retrievers using the formula:
     $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k=60)$$
   - Grounded context from top-ranked fused documents is passed to **Vertex AI Gemini 2.5 Flash** for strict, hallucination-free response drafting.
4. **Diagnostics & Cloud Health Tooling**:
   - Automated CLI diagnostics script (`backend/scripts/verify_cloud_connections.py`) and FastAPI `/health` endpoint validating live health, version, latency, and index readiness across PostgreSQL (Neon), Algolia Cloud, Pinecone Serverless, and Google Cloud Vertex AI.

## Consequences

### Positive
- **High precision and recall**: Captures both exact regulatory/technical keywords and semantic concepts.
- **Enterprise Cloud Ready**: Zero-code friction using production Algolia Cloud & Pinecone Serverless clusters.
- **High-Performance Ingestion**: Batched embeddings combined with Algolia batching and Pinecone bulk upserts reduce document upload latency.
- **Resilience**: If either retriever experiences high latency or degraded state, results can still be served from the available retriever.
- **Tenant isolation**: Enforces tenant-level isolation across both Algolia query filters and Pinecone metadata filters.
- **Grounded LLM context**: Provides citations with source IDs, source file names, page numbers, and retriever origin tags.

### Negative / Trade-offs
- Requires maintaining and synchronizing credentials for two search systems alongside the primary database.
- Batch upserts and deletes must update both Algolia and Pinecone.
