# ADR 0009: Passage-Based Document Ingestion and LLM Question-Answering Reasoning

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

In standard enterprise workflows, source documentation (SOC 2 Type II audit whitepapers, SLA contracts, disaster recovery runbooks, API integration manuals, HR policies) consists of **arbitrary narrative prose, technical specifications, and legal clauses**. These documents do not contain pre-packaged "Question and Answer" pairs.

Previous iterations assumed source documents would arrive as structured Q&A pairs, or generated synthetic pseudo-questions during parsing (e.g., `"02 Sla Disaster Recovery And Operations - Page 2: 3. Disaster Recovery..."`). 

This approach introduced several limitations:
1. **Artificial Ingestion Constraints**: Forcing narrative documents into Q&A structures led to awkward question formulations and degraded retrieval quality.
2. **Vector Space Dilution**: Embedding synthetic questions alongside passage text distorted cosine similarity metrics in vector search.
3. **Rigid Schema Dependencies**: Search interfaces and storage schemas expected `question` and `answer` columns, failing to accommodate general document excerpts.

## Decision

We establish a **passage-based documentation ingestion architecture** and delegate semantic question matching, policy extraction, and answer synthesis entirely to the LLM (**Google Cloud Vertex AI Gemini 2.5 Flash**):

### 1. General Document Passage Model
All document formats (PDF, DOCX, Markdown, TXT, CSV, JSON) are chunked into coherent 300–500 token passages structured with:
- **`title`**: Natural section heading, chapter header, or topical clause (e.g., `2.2 Encryption at Rest`, `Production Service Level Agreement (SLA)`, `Salesforce CRM Connector`).
- **`content`**: Raw narrative policy text, clause excerpt, or technical specification.
- **`category`**: Inferred or assigned taxonomy domain (`Security & Cryptography`, `Compliance & Security`, `SLA & Operations`, `Privacy & Legal`, `Product & Integrations`, `HR & Corporate Policies`).
- **`metadata`**: Provenance lineage including `source_file`, `page_number`, `section`, `chunk_index`, and file format.

### 2. Dual-Engine Retrieval Alignment
- **Elasticsearch (Sparse BM25)**: Matches the buyer's query across text fields with boosted title weighting: `["title^2", "content"]`.
- **Pinecone Serverless (Dense Vectors)**: Generates 768-dimensional normalized embeddings via Google Cloud Vertex AI `text-embedding-004` on formatted passage text (`f"Title: {title}\n\nContent: {content}"`).
- **Reciprocal Rank Fusion (RRF)**: Merges sparse BM25 keyword matches with dense semantic matches to produce top-ranked passage candidates.

### 3. LLM Reasoning & Grounded Synthesis
- The user's RFP requirement or question is passed to **Gemini 2.5 Flash** alongside the top-ranked documentation passages.
- The model reads the retrieved policy passages, reasons over the technical constraints, extracts relevant facts, and synthesizes a direct, comprehensive, and professional RFP response with source citations.
- Hallucination guardrails instruct the model to answer solely using the provided documentation passages and explicitly declare when a requested topic is not covered in approved documentation.

### 4. Backwards Compatibility
- Schemas (`schemas.py`) and database models (`db_models.py`) provide bidirectional alias mappings (`title` $\leftrightarrow$ `question`, `content` $\leftrightarrow$ `answer`), allowing existing frontend views, review workflows, and browser extensions to function without breaking changes.

## Consequences

### Positive
- **Format Agnostic**: Any arbitrary enterprise policy, technical manual, or legal agreement can be uploaded without pre-formatting or restructuring.
- **Superior Retrieval Accuracy**: Vector embeddings represent true document semantics rather than fabricated pseudo-questions.
- **Context-Rich LLM Synthesis**: Gemini 2.5 Flash produces articulate, tailored responses that directly address the specific wording of incoming RFP questions while remaining strictly grounded in company policy.
- **Full Traceability**: Every generated answer is backed by granular citations linking back to specific document filenames, page numbers, and section headings.

### Negative / Trade-offs
- Answering relies on LLM inference latency at search time rather than instant static lookup. This is mitigated by using Gemini 2.5 Flash with sub-second generation times.

