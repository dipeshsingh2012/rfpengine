# ADR 0007: Multi-Format Knowledge Base Ingestion and Search-Index-Only Chunking Strategy

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

RFPEngine requires ingesting diverse seller documentation formats—ranging from structured Q&A files (CSV, TSV, JSON, JSONL) to semi-structured policies (Markdown, DOCX) and unstructured compliance whitepapers (SOC 2 PDFs, TXT). 

Two key architectural challenges arose:
1. **Chunking Strategy & Vector Quality**:
   - Chunks that are too large (>1000 tokens) result in diluted vector embeddings and poor semantic matching against granular buyer questions.
   - Chunks that are too small (<100 tokens) lack surrounding context, exceptions, and SLAs needed by the LLM (`gpt-4o`) to formulate accurate answers.
2. **Datastore Separation & Postgres Bloat**:
   - Storing high-volume, fine-grained document chunks in relational PostgreSQL tables introduces schema maintenance overhead, storage inflation, and database bloat without providing search benefits.
   - Live search is conducted across Elasticsearch (BM25 keyword search) and Pinecone (dense vector search), merged via Reciprocal Rank Fusion (RRF).

## Decision

We establish a dedicated **multi-format ingestion pipeline** and a **search-index-only chunking model**:

1. **Multi-Format Parsing (`DocumentParserService`)**:
   - **Tabular (`.csv`, `.tsv`, `.json`, `.jsonl`)**: Atomic 1:1 Q&A pair extraction using smart header mapping (`question`, `answer`, `category`, `tags`).
   - **Markdown (`.md`) / DOCX (`.docx`)**: Heading-aware splitting based on document section hierarchy (`#`, `##`, `###`).
   - **PDF (`.pdf`) & Plain Text (`.txt`)**: Recursive character sliding-window chunking along paragraph (`\n\n`), line (`\n`), and sentence (`. `) boundaries.

2. **Chunking & Vector Specifications**:
   - **Target Chunk Size**: **300–500 tokens** (~1,200–2,000 characters).
   - **Chunk Overlap**: **50 tokens** (~200 characters) to preserve contextual continuity.
   - **Embedding Model**: OpenAI **`text-embedding-3-small`** (1,536 dimensions, normalized floating-point vectors).
   - **Vector Distance Metric**: **Cosine Similarity** in Pinecone.
   - **Pre-Embedding Prompt Formulation**:
     ```python
     embedding_payload = f"Topic: {section_or_question}\n{chunk_text}"
     ```

3. **Search-Index-Only Ingestion**:
   - Ingested document chunks are indexed directly into **Elasticsearch** (BM25 inverted index + full document text in `_source`) and **Pinecone** (dense vectors + citation metadata).
   - **PostgreSQL Bypassed for Chunks**: PostgreSQL does not store raw chunk records and is reserved strictly for operational relational entities (`response_workspaces`, `question_reviews`, approval state machines).
   - Knowledge Base library management (list, preview, delete) interacts directly with Elasticsearch and Pinecone.

## Consequences

### Positive
- **Optimal Retrieval Precision**: 300–500 token chunks prevent vector dilution while giving `gpt-4o` enough context for complete answers.
- **Lean PostgreSQL Database**: Relational storage remains lean and unburdened by high-volume chunked document text.
- **Rich Citation Lineage**: Every vector in Pinecone and document in Elasticsearch retains `source_file`, `page_number`, `section_title`, and `chunk_index` for granular citations in generated responses.
- **Instant Keyword & Semantic Dual-Hydration**: Elasticsearch serves document text directly from its `_source` store with zero database round-trips.

### Negative / Trade-offs
- Re-indexing entire knowledge bases requires re-uploading source documents or exporting raw documents directly from Elasticsearch.
