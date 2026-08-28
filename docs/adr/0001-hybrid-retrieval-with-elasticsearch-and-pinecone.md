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
1. **Elasticsearch (Sparse / BM25)**:
   - Indexes `tenant_id`, `question`, `answer`, `category`.
   - Performs BM25 keyword matching with query boosting on question fields and tenant filtering.
2. **Pinecone (Dense / Vector k-NN)**:
   - Indexes 1536-dimensional embeddings generated with OpenAI (`text-embedding-3-small`).
   - Performs cosine similarity search with tenant metadata filtering (`{"tenant_id": {"$eq": tenant_id}}`).
3. **Reciprocal Rank Fusion (RRF)**:
   - Merges ranked lists from both retrievers using the formula:
     $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k=60)$$
   - Grounded context from top-ranked fused documents is passed to OpenAI (`gpt-4o`) for strict, hallucination-free response drafting.

## Consequences

### Positive
- **High precision and recall**: Captures both exact regulatory/technical keywords and semantic concepts.
- **Resilience**: If either retriever is experiencing high latency, degraded results can still be served from the available retriever.
- **Tenant isolation**: Enforces tenant-level isolation across both Elasticsearch queries and Pinecone metadata filters.
- **Grounded LLM context**: Provides citations with source IDs and retriever origin tags (`elasticsearch`, `pinecone`, or `elasticsearch+pinecone`).

### Negative / Trade-offs
- Requires maintaining and synchronizing two search systems alongside the primary database.
- Batch upserts and deletes must update both Elasticsearch and Pinecone.

