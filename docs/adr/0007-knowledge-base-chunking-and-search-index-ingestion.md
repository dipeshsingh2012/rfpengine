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
   - **Deterministic ID Generation**: `kb-{hashlib.sha256(tenant::question::answer)[:12]}` for 100% idempotent upserts.
   - **Primary Embedding Model**: Google Cloud Vertex AI **`text-embedding-004`** (768 dimensions, normalized floating-point vectors).
   - **Vector Distance Metric**: **Cosine Similarity** in Pinecone Serverless.
   - **Pre-Embedding Prompt Formulation**:
     ```python
     embedding_payload = f"Topic: {section_or_question}\n{chunk_text}"
     ```

3. **Automatic Category Inference**:
   - The ingestion parser automatically infers enterprise taxonomy categories (`Security & Cryptography`, `Compliance & Security`, `SLA & Operations`, `Privacy & Legal`, `Product & Integrations`, `HR & Corporate Policies`) based on filename and section heading signals, eliminating manual input friction on upload.
   - Paved path for an asynchronous background LLM worker (`gemini-2.5-flash-lite`) to perform fine-grained zero-shot classification and compliance tag enrichment.

4. **Idempotent 3-Way Synchronization & Retrieval Playground**:
   - Ingested document chunks are indexed directly and idempotently into **PostgreSQL** (`kb_entries`), **Elastic Cloud** (BM25 inverted index + full text in `_source`), and **Pinecone Serverless** (dense vectors + citation metadata).
   - **Idempotent Seeding Pipeline**: `scripts/seed_data.py` performs atomic pruning on existing tenant vectors and documents, guaranteeing that running the seed 1 time or 100 times always results in an exact 1:1 match across all 3 storage backends.
   - **Retrieval Playground (`/playground`)**: A dedicated testing interface allowing sellers and engineers to run ad-hoc queries, inspect Elasticsearch (BM25) vs Pinecone (dense vector) matches, observe RRF fusion scores, and review Gemini answer generation with confidence metrics.
   - **Demo Sample Documents (`/sample_docs/`)**: Multi-format test documents (`.md`, `.pdf`, `.json`, `.csv`, `.docx`, `.txt`) are bundled in the web app's `public/` directory for instant single-click demo downloads on any machine.

## Consequences

### Positive
- **Optimal Retrieval Precision**: 300–500 token chunks prevent vector dilution while giving Gemini 2.5 Flash enough context for complete answers.
- **100% Idempotent Multi-Store Sync**: Deterministic hashing and atomic tenant pruning ensure zero record drift across PostgreSQL, Elastic Cloud, and Pinecone.
- **Zero-Friction Ingestion**: Sellers simply drop files into the UI without needing to configure or tag categories manually.
- **Real-Time Retrieval Transparency**: The Playground enables immediate inspection of retrieval scoring and source passage ranking.
- **Rich Citation Lineage**: Every vector in Pinecone and document in Elasticsearch retains `source_file`, `page_number`, `section_title`, and `chunk_index` for granular citations in generated responses.
- **Instant Keyword & Semantic Dual-Hydration**: Elasticsearch serves document text directly from its `_source` store with zero database round-trips.

### Negative / Trade-offs
- Re-indexing entire knowledge bases requires re-uploading source documents or exporting raw documents directly from Elasticsearch.

