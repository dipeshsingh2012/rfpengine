# Product & Engineering Backlog

This backlog tracks prioritized architectural enhancements, AI optimizations, and feature roadmap items for **RFPEngine**.

---

## 🚀 High-Priority Backlog

### 1. Asynchronous LLM-Powered Document & Taxonomy Classification (Background Task)
* **Goal**: Replace or augment rule-based heuristics with an asynchronous background worker that uses a fast LLM (`gpt-4o-mini` or `gpt-4o`) to classify uploaded documents, infer fine-grained enterprise categories, and tag regulatory frameworks.
* **Architecture**:
  1. `POST /api/v1/knowledge-base/upload` accepts document and immediately indexes chunks with fast heuristic categorization.
  2. Dispatches a non-blocking `asyncio` background task (`FastAPI BackgroundTasks` or Celery/Cloud Tasks worker).
  3. Worker extracts document sample (first 1,500 tokens) and queries LLM with structured JSON output:
     ```json
     {
       "primary_category": "Security & Cryptography",
       "secondary_tags": ["TLS 1.3", "AES-256", "Key Management", "AWS KMS"],
       "regulatory_frameworks": ["SOC 2 Type II", "ISO 27001"],
       "document_type": "Security Whitepaper",
       "confidence": 0.96
     }
     ```
  4. Worker asynchronously updates Elasticsearch document `_source` and Pinecone vector metadata with the enriched taxonomy tags without blocking user upload response.

---

### 2. Neural Cross-Encoder Reranking Layer (Cohere Rerank / BGE-Reranker)
* **Goal**: Enhance hybrid search precision by passing the top 20 candidate chunks retrieved by Reciprocal Rank Fusion (RRF) through a cross-encoder model before feeding context into `gpt-4o`.
* **Architecture**:
  * Integrate Cohere Rerank API (`rerank-english-v3.0`) or local cross-encoder (`bge-reranker-large`).
  * Yields higher contextual relevance for nuanced, multi-part security questions.

---

### 3. Multi-Tenant Namespace Partitioning & Granular Access Control
* **Goal**: Support enterprise customers with sensitive departments (e.g. Legal vs. Core Security vs. Commercial Pricing) where certain knowledge documents must only be retrieved for authorized reviewer roles.
* **Architecture**:
  * Namespace-scoped Pinecone indexes and Elasticsearch filtering via `tenant_id` + `role_acl` fields.

---

### 4. Direct Spreadsheet & PDF Questionnaire Parser (Buyer Form Ingestion)
* **Goal**: Allow sellers to upload complex multi-tab Excel (`.xlsx`), CSV, or PDF security questionnaires directly, automatically extracting questions, table coordinates, and answer cells.
* **Architecture**:
  * Build `QuestionnaireParserService` using `openpyxl` and LLM-assisted table coordinate mapping.
  * Auto-populate `response_workspaces` and `question_reviews` in PostgreSQL.

---

### 5. Grounded Hallucination Guardrails & Self-Critique Evaluation
* **Goal**: Automated assertion checking to verify that every claim in a drafted answer is explicitly grounded in the retrieved sources before presenting to the reviewer.
* **Architecture**:
  * Two-pass verification: LLM answer generator $\rightarrow$ LLM critique model checking source sentence overlap $\rightarrow$ confidence calibration score.

---

### 6. Continuous Knowledge Base Connectors (Confluence / Notion / Google Drive)
* **Goal**: Scheduled background synchronization to automatically pull and re-index updated policies from enterprise wikis.
* **Architecture**:
  * Webhook listener / daily cron job with delta-change detection (ETag / last-modified hash).

---

## 📋 Task Checklist

- [ ] **Task 1.1**: Define Pydantic schema for `LLMDocumentClassification` (category, tags, standards).
- [ ] **Task 1.2**: Implement `AsyncClassificationWorker` in `backend/app/services/classification_service.py`.
- [ ] **Task 1.3**: Wire background classification task into `POST /api/v1/knowledge-base/upload`.
- [ ] **Task 1.4**: Add metadata patch methods in `ElasticsearchService` and `PineconeService`.
- [ ] **Task 2.1**: Implement `RerankerService` integrating Cohere Rerank v3.
- [ ] **Task 3.1**: Add department/role metadata tagging to Knowledge Base upload pipeline.
- [ ] **Task 4.1**: Create Excel `.xlsx` multi-sheet questionnaire extractor.
- [ ] **Task 5.1**: Implement hallucination check validator in `HybridSearchService`.

