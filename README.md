# RFPEngine

[![Autonomous SDLC: Agentic Fleet](https://img.shields.io/badge/Autonomous%20SDLC-Agentic%20Fleet%20v1-blueviolet?logo=github)](https://github.com/marketplace/actions/agentic-fleet-autonomous-5-agent-sdlc)
[![CI Test Suite](https://github.com/dipeshsingh2012/rfpengine/actions/workflows/ci.yml/badge.svg)](https://github.com/dipeshsingh2012/rfpengine/actions)

**RFPEngine** is an AI-assisted seller-side RFP (Request for Proposal) and vendor security questionnaire platform. It combines hybrid vector-sparse search, continuous knowledge ingestion, multi-stakeholder governance, and direct-in-browser auto-fill to help enterprise revenue and compliance teams complete questionnaires in minutes instead of weeks.

---

## 🎯 The Problem

B2B sales cycles and enterprise vendor security assessments are bottlenecked by high-friction questionnaire workflows:

* **Siloed & Rapidly Stale Documentation**: Compliance certifications (SOC 2, ISO 27001, HIPAA), security whitepapers, and SLA policies live scattered across Notion, GitHub repositories, Google Drive, and cloud object stores.
* **Repetitive SME Overhead**: Solutions engineers, InfoSec leads, and product managers waste dozens of hours re-answering near-identical questions across different buyer formats.
* **Costly Hallucination Risks**: Naive generative AI solutions draft plausible-sounding answers that introduce legal, technical, or SLA liabilities if unverified.
* **Context Switching & Manual Data Entry**: Teams spend hours copy-pasting answers back and forth between internal wikis, spreadsheets, and cumbersome web-based buyer security portals (e.g., OneTrust, Whistic, Loopio).

---

## 🚀 Key Product Features

### 🔍 Grounded Hybrid Search & Automated Drafting
* **Dual Sparse & Dense Retrieval**: Merges keyword-exact matching with deep semantic vector search to surface the exact clauses, sections, and compliance certifications needed.
* **Grounded Answer Generation**: Uses enterprise LLM reasoning strictly anchored to retrieved citations, outputting a visual confidence score (0–100%) alongside verified source references.
* **1.75x Golden Q&A Promotion**: Elevates verified, human-approved answers to canonical reference status, boosting their retrieval rank across future RFP iterations.

### 📝 Questionnaire Curation & Verification Studio (`/review/:id`)
* **Split-View Document Comparison**: Embedded native PDF reference viewer (`<iframe>` blob) side-by-side with parsed questions for immediate verification.
* **✨ AI Question Rephrasing**: Standardizes OCR scans, compound requirements, or clumsy buyer phrasing into clear compliance prompts with before/after diff modals.
* **Autonomous Feedback Telemetry**: Learns from human corrections, deletions (false-positive noise filters), and explicit rating signals (`👍 / 👎`) to tune subsequent document parsing runs.

### 🔄 Continuous Knowledge Synchronization & Connectors
* **Zero-Manual-Upload Connectors**: Syncs enterprise documentation directly from live web trust centers, GitHub repositories, and cloud object stores.
* **SHA-256 Delta Hashing**: Avoids redundant LLM embedding costs by hashing content chunks and skipping untouched passages.
* **Atomic Triple-Store Pruning**: Automatically purges stale or modified chunks across relational, sparse, and vector stores to eliminate obsolete answers.

### 🛡️ Human-in-the-Loop Governance & Multi-Role Reviews
* **Review Lifecycle Management**: Tracks proposal progress through distinct KanBan stages (Drafting, SME Review, Approved, Exported).
* **Role-Based Sign-Offs**: Enforces clear stakeholder accountability between Proposal Managers, Security Officers, and Solutions Engineers before deliverables leave the building.

### 🧩 Manifest V3 In-Browser Form Filler
* **Direct Portal Integration**: An enterprise Chrome extension that reads buyer questionnaire fields on third-party web portals and injects approved answers directly into web forms.

### 🗺️ Live Discovery & Strategy Roadmap (`https://rfpengine.aroadmap.dev`)
* **Interactive Kanban Lifecycle**: Real-time visibility into feature stages from Discovery through Production Deployment.
* **RICE Prioritization Matrix**: Data-driven backlog ranking based on `(Reach × Impact × Confidence) ÷ Effort`.
* **Living PRD Drawer**: Product specifications featuring Problem Statements, User Stories, and Gherkin Acceptance Criteria.

---

## 🔌 Model Context Protocol (MCP) Integration

RFPEngine implements a production **Model Context Protocol (MCP)** server conforming to the JSON-RPC 2.0 open standard. It enables local IDE assistants (Antigravity, Cursor, Claude Code) and remote multi-agent swarms to directly interact with RFPEngine domain capabilities.

### Available MCP Tools

| Tool Name | Description | Key Arguments |
| :--- | :--- | :--- |
| **`search_knowledge_base`** | Performs hybrid vector and keyword search across verified compliance whitepapers. | `query` (str, required), `limit` (int, default=5) |
| **`manage_roadmap`** | Queries live discovery backlog, retrieves Gherkin criteria, or transitions KanBan stages in PostgreSQL. | `action` (`"list"` \| `"get"` \| `"create"` \| `"update"`), `item_id` (str), `payload` (dict) |
| **`get_cloud_diagnostics`** | Executes live latency checks and health reports across PostgreSQL, Cloud Run, and search indexes. | `service_name` (str, default=`"all"`) |

### Dual Transport Modes

1. **Local `stdio` Transport (For IDEs & CLIs)**:
   * Communicates via standard input/output with sub-millisecond execution.
   * Command: `python -m app.mcp.server`

2. **Remote `SSE` Streaming Transport (For Cloud Run & Remote Agents)**:
   * Persistent Server-Sent Events stream at `GET /api/v1/mcp/sse` (requires `X-Tenant-ID` header).
   * JSON-RPC message ingestion at `POST /api/v1/mcp/messages`.

### Connecting Your IDE (Antigravity / Cursor / Claude Code)

Add the RFPEngine MCP server to your IDE configuration (`~/.gemini/antigravity/mcp_config.json` or `.vscode/mcp.json`):

{
  "mcpServers": {
    "rfpengine": {
      "command": "/home/dipes/projects/RFPEngine/backend/.venv/bin/python",
      "args": ["-m", "app.mcp.server"],
      "cwd": "/home/dipes/projects/RFPEngine/backend",
      "env": {
        "PYTHONPATH": "/home/dipes/projects/RFPEngine/backend",
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/rfpengine"
      }
    }
  }
}

### Quick CLI Testing

cd backend
.venv/bin/python -c "
import asyncio
from app.mcp.server import MCPServer

async def test():
    server = MCPServer()
    res = await server.handle_request({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': 'manage_roadmap', 'arguments': {'action': 'list'}}})
    print(f'Total Roadmap Items: {res[\"result\"][\"total\"]}')

asyncio.run(test())
"

---

## 🏛️ System Architecture

[Architecture Flowchart]
Clients (React Workspace, Manifest V3 Extension) -> Cloud Run FastAPI Backend
Ingestion Pipeline (Uploads, DocumentParserService 300-500 Token Chunking) -> Search Indexes
Continuous Sync (Web Trust Crawler, GitHub Docs, S3/GCS, RFP Harvester) -> KBSyncService -> Tri-Store
Backend Services (HybridSearchService, RRF, Postgres, Algolia, Pinecone) -> Storage Layer
Search & Vectors (Algolia Sparse/BM25 + Pinecone 768-dim Dense k-NN + Vertex AI text-embedding-004 / Gemini 2.5 Flash)
Relational Persistence (Neon PostgreSQL 17 for Workspaces, Reviews, Canonical Records)

### Ingestion & Passage Chunking Strategy

Documents are parsed into semantically coherent narrative passages rather than arbitrary character splits, leaving question-to-passage contextual reasoning to **Gemini 2.5 Flash**:

| File Type | Parsing & Chunking Strategy | Target Chunk Size | Section Title / Header Mapping |
| :--- | :--- | :--- | :--- |
| **Markdown (`.md`)** | **Heading-Aware Hierarchy** (`#`, `##`, `###`) | 300–500 tokens | Heading text (e.g. `2.2 Encryption at Rest`) |
| **DOCX (`.docx`)** | **Document & Heading Hierarchy** | 300–500 tokens | Heading / section title (e.g. `1. REST API Architecture`) |
| **PDF (`.pdf`)** | **Page & Paragraph Sliding Window** | 300–500 tokens (~1.6k chars) | Document title + page number + section |
| **Text (`.txt`)** | **Recursive Character Sliding Window** | 300–500 tokens (50-tok overlap) | Document title + topical clause |
| **CSV / TSV** | **Row Extraction** (1 row = 1 record) | 100–300 tokens | Column: `topic` / `question` / `title` |
| **JSON / JSONL** | **Structured Objects / Lines** | 100–300 tokens | Key: `topic` / `question` / `title` |

### Embedding Specifications
* **Primary Model**: Google Cloud Vertex AI `text-embedding-004` (768 dimensions)
* **Similarity Metric**: Cosine Similarity in Pinecone Serverless
* **Passage Format**: `Title: {title}\n\nContent: {content}`
* **Storage Synchronization**: Passage chunks are synchronized idempotently across **PostgreSQL** (`kb_entries`), **Algolia Cloud** (BM25 sparse search), and **Pinecone Serverless** (dense vector k-NN).

---

## 🔄 Automated Knowledge Base Syncing & Connectors

RFPEngine features an **Autonomous Continuous Ingestion & Synchronization Engine** (`kb_sync_service.py`) that connects directly to live enterprise documentation sources:

* **🌐 Web Trust Portal** (`web_crawler`): Zero-dependency HTML parser stripping scripts, styles, navs, and footers. Traverses trust centers, Notion pages, and compliance portals.
* **🐙 GitHub Documentation** (`github_docs`): Pulls markdown specifications, architecture RFCs, and policies (`/docs`, `SECURITY.md`). Preserves file paths and directory hierarchy.
* **☁️ Cloud Storage** (`cloud_storage`): Continuously scans S3/GCS buckets or local folders for updated whitepapers (`.pdf`, `.docx`, `.md`, `.xlsx`). Ingests delta modifications without re-indexing unchanged documents.
* **🏆 RFP SME Harvester** (`rfp_harvest`): Automatically extracts verified, human-approved answers from completed workspaces. Applies a **1.75x Authority Multiplier** in RRF hybrid retrieval.

### Smart Delta Hashing & Atomic Store Pruning
* **Content Hashing**: Deterministic `SHA-256` hashes (`sha256(source_url + chunk_content)`). Unchanged passages are skipped, incurring zero AI embedding cost.
* **Atomic 3-Way Store Pruning**: Outdated passages are synchronously purged across PostgreSQL (`kb_entries`), Algolia Cloud, and Pinecone Serverless.
* **Execution Modes**: On-Demand 1-Click Sync, Scheduled Intervals (`hourly`, `daily`, `weekly`), and Inbound Webhooks (`POST /api/v1/knowledge-base/sources/{id}/webhook`).

---

## 📝 Questionnaire Review & Curation Studio (`/review/:id`)

When uploading complex multi-format vendor questionnaires, RFPEngine presents an interactive **Curation & Verification Studio** before importing into active drafting workspaces:

* **📄 Original Document Reference Viewer**: Embedded native PDF renderer (`<iframe>` blob) with zoom, search, and page navigation side-by-side with parsed questions. Supports Side-by-Side Split View or Slide-Over Drawer modes.
* **✨ Question-Wise AI Rephrasing**: Powered by **Google Cloud Vertex AI (`gemini-2.5-flash`)** via `POST /api/v1/responses/rephrase-question`. Standardizes OCR scans and compound requirements into crisp compliance syntax.
* **🔄 Guided Complete Document Re-Parsing**: Re-runs extraction with custom natural language guidance.
* **🧠 Autonomous AI Feedback Loop**: Tracks deletions as false-positive signals, edits as prompt syntax improvements, and records quality ratings (`👍 / 👎`).

---

## 🛠️ Architecture Decision Records (ADRs)

Key architectural decisions are documented in the `docs/adr/` directory:

- [ADR 0001: Hybrid Search with Algolia and Pinecone via Reciprocal Rank Fusion](docs/adr/0001-hybrid-retrieval-with-algolia-and-pinecone.md)
- [ADR 0022: Swap Elasticsearch with Algolia for Sparse Retrieval](docs/adr/0022-swap-elasticsearch-with-algolia-for-sparse-retrieval.md)
- [ADR 0002: Relational Persistence with PostgreSQL for Canonical Records and Review Tracking](docs/adr/0002-relational-persistence-with-postgresql.md)
- [ADR 0003: Human-in-the-Loop Governance, Multi-Role Approval, and Form Insertion Safety](docs/adr/0003-human-in-the-loop-governance-and-extension-safety.md)
- [ADR 0004: Decoupled Seller Workspace and Manifest V3 Browser Extension Architecture](docs/adr/0004-decoupled-seller-workspace-and-browser-extension.md)
- [ADR 0005: Database Migrations with Alembic](docs/adr/0005-database-migrations-with-alembic.md)
- [ADR 0006: Centralized Secrets Management with GCP Secret Manager and Terraform](docs/adr/0006-centralized-secrets-management-with-gcp-secret-manager.md)
- [ADR 0007: Multi-Format Knowledge Base Ingestion and Search-Index-Only Chunking Strategy](docs/adr/0007-knowledge-base-chunking-and-search-index-ingestion.md)
- [ADR 0008: Native Google Cloud Vertex AI (Gemini 2.5 Flash and text-embedding-004) for Enterprise Inference](docs/adr/0008-native-gcp-vertex-ai-gemini-and-embeddings.md)
- [ADR 0009: Passage-Based Document Ingestion and LLM Question-Answering Reasoning](docs/adr/0009-passage-based-document-ingestion-and-llm-reasoning.md)
- [ADR 0010: Multi-Environment Isolation, Vector Namespacing, and Production Secret Propagation](docs/adr/0010-multi-environment-isolation-and-production-secret-propagation.md)
- [ADR 0011: Continuous Deployment to Google Cloud Run via GitHub Actions](docs/adr/0011-continuous-deployment-to-cloud-run-via-github-actions.md)
- [ADR 0012: In-App Product Discovery and RICE Prioritization Roadmap Hub](docs/adr/0012-product-discovery-and-prioritization-roadmap-hub.md)
- [ADR 0013: Manifest V3 Background Service Worker IPC and Sandboxed Storage Sync](docs/adr/0013-manifest-v3-background-service-worker-ipc-and-sandboxed-storage-sync.md)
- [ADR 0014: Four-Role Enterprise Governance and SME Review Queue](docs/adr/0014-four-role-enterprise-governance-and-sme-review-queue.md)
- [ADR 0015: Continuous Discovery and Opportunity-First Product Framing](docs/adr/0015-continuous-discovery-and-opportunity-solution-framing.md)
- [ADR 0016: Relational Persistence for Product Roadmap and Discovery Backlog](docs/adr/0016-relational-persistence-for-product-roadmap-and-discovery-backlog.md)
- [ADR 0017: Specialized AI Proposal Drafter and Multi-Agent Swarm Evolution](docs/adr/0017-specialized-ai-proposal-drafter-and-multi-agent-swarm-evolution.md)
- [ADR 0018: Enterprise Testing Strategy and Automated Verification Matrix](docs/adr/0018-enterprise-testing-strategy-and-automated-verification-matrix.md)
- [ADR 0019: Closed-Loop AI Feedback Architecture: Golden Q&A Promotion and Exemplar Learning](docs/adr/0019-closed-loop-ai-feedback-architecture.md)
- [ADR 0020: Autonomous 5-Agent SDLC Governance & Branching Architecture](docs/adr/0020-autonomous-5-agent-sdlc-governance.md)
- [ADR 0021: Multi-Tenant B2B Authentication via Google Cloud Identity Platform](docs/adr/0021-multi-tenant-authentication-with-google-cloud-identity-and-sso.md)
- [ADR 0022: Model Context Protocol (MCP) Integration for IDEs and Chat Assistants](docs/adr/0022-model-context-protocol-mcp-integration-for-ide-and-chat.md)

---

## ⚡ API Reference

### 1. Hybrid Search & Answer Generation
- **`POST /api/v1/search`**: Concurrently queries Algolia (sparse) and Pinecone (dense vector k-NN), merges via RRF, applies the 1.75x Golden Q&A boost, and drafts an answer using Gemini 2.5 Flash.
  Payload: `{"tenant_id": "acme-corp", "question": "Describe your data retention policy.", "top_k": 5}`

### 2. Knowledge Base Ingestion & Continuous Sync
- **`POST /api/v1/knowledge-base/upload`**: Multipart file upload (`.csv`, `.tsv`, `.xlsx`, `.pdf`, `.docx`, `.txt`, `.md`). Applies 300–500 token chunking and indexes across PostgreSQL, Algolia, and Pinecone.
- **`GET /api/v1/knowledge-base?tenant_id=acme-corp`**: List indexed knowledge records with pagination.
- **`GET /api/v1/knowledge-base/{id}`**: Get a specific knowledge record.
- **`POST /api/v1/knowledge-base`**: Create a single record across all three data stores.
- **`POST /api/v1/knowledge-base/batch`**: Batch import multiple records across all three stores.
- **`DELETE /api/v1/knowledge-base/{id}`**: Remove a record synchronously across all stores.
- **`GET /api/v1/knowledge-base/sources`**: List all configured automated ingestion sources.
- **`POST /api/v1/knowledge-base/sources`**: Register a new source (`web_crawler`, `github_docs`, `cloud_storage`, `rfp_harvest`).
- **`GET /api/v1/knowledge-base/sources/{id}`**: Retrieve configuration and sync status.
- **`PUT /api/v1/knowledge-base/sources/{id}`**: Update source parameters, category, or schedule.
- **`DELETE /api/v1/knowledge-base/sources/{id}`**: Delete source and optionally prune indexed passages.
- **`POST /api/v1/knowledge-base/sources/{id}/sync`**: Trigger on-demand sync run.
- **`POST /api/v1/knowledge-base/sync-all`**: Trigger sync across all active sources.
- **`POST /api/v1/knowledge-base/sources/{id}/webhook`**: Inbound webhook for event-driven triggers.
- **`GET /api/v1/knowledge-base/sources/{id}/logs`**: Retrieve historical execution logs and passage metrics.

### 3. Questionnaire Curation & Feedback Loop
- **`POST /api/v1/responses/parse-file`**: Parse uploaded questionnaires (`.pdf`, `.docx`, `.xlsx`, `.csv`) using Gemini 2.5 Flash and heuristics.
- **`POST /api/v1/responses/rephrase-question`**: Standardize question text into clean enterprise compliance syntax.
- **`POST /api/v1/responses/parser-feedback`**: Record review-time user corrections, deletions, and quality ratings (`👍 / 👎`).
- **`POST /api/v1/responses/export`**: Export proposal deliverable as `.docx`, `.xlsx`, `.csv`, `.pdf`, or JSON.

### 4. Workspaces & Review Persistence (PostgreSQL)
- **`POST /api/v1/responses/workspaces`**: Save an imported questionnaire workspace and questions.
- **`GET /api/v1/responses/workspaces/{id}`**: Retrieve workspace session and review stages.
- **`PUT /api/v1/responses/workspaces/{id}`**: Update answers and review statuses.
- **`POST /api/v1/responses/workspaces/{id}/questions/{index}/promote`**: 1-click promote an approved answer to canonical **Golden Q&A**.

### 5. Health & Diagnostics
- **`GET /health`**: Returns real-time connection status and latency metrics for PostgreSQL, Algolia Cloud, Pinecone Serverless, GCP Secret Manager, and Vertex AI.

---

## 💻 Frontend Routes & Pages

| Route Path | Page / View Name | Primary Features & User Workflows |
| :--- | :--- | :--- |
| **`GET /`** | **Overview & Importer** | • Import questionnaires via URL or file upload (`.csv`, `.json`, `.xlsx`, `.pdf`, `.docx`)<br>• Quick-start starter questions and project summaries |
| **`GET /response/workspace/:id`** | **Interactive Drafting Workspace** | • Split-pane drafting view with real-time Gemini 2.5 Flash answers<br>• Confidence scoring ring (0–100%) and cited hybrid sources<br>• In-line answer editor and reviewer role assignment |
| **`GET /review/:id`** | **Curation & Verification Studio** | • Embedded native PDF viewer (Split-view and slide-over drawer)<br>• Curation controls: editing, deletion of false positives<br>• Rephrase with AI and natural-language re-parsing guidance |
| **`GET /knowledge-base`** | **Knowledge Base Hub** | • Drag-and-drop multi-format uploader with 300–500 token chunking<br>• Automated continuous sync connectors and passage pruning |
| **`GET /playground`** | **Retrieval & Search Playground** | • Interactive query testing against Algolia and Pinecone<br>• Real-time Reciprocal Rank Fusion (RRF) score inspection |

---

## 🔒 Multi-Environment Isolation & Secret Propagation

* **Vector Namespacing**: Pinecone Serverless is partitioned into namespaces (`namespace: "local"` vs `namespace: "prod"`). Local tests write only to `local`.
* **Zero-Secret Docker Images**: `.env` and `.env.local` are excluded from builds via `.dockerignore`.
* **GCP Secret Manager**: Single source of truth for production secrets (`DATABASE_URL`, `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `PINECONE_API_KEY`).
* **Cloud Run Boot Injection**: Secrets are mounted directly into container memory via Terraform `secret_key_ref`.
* **Endpoints**: Production API runs at `https://rfpengine-api-714049712844.us-central1.run.app`.

---

## 📋 Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: 20 or newer and `npm`
- **Terraform**: 1.5 or newer
- **Google Cloud SDK (`gcloud`)**: For Vertex AI and Cloud Run
- **GCP Service Account Key (`gcp-key.json`)**: Local ADC credentials
- **Neon PostgreSQL Connection String**
- **Pinecone API Key** & **Algolia Cloud Credentials**
- **Browser**: Google Chrome or Microsoft Edge

---

## 🚀 Quickstart (Local Development)

### 1. Environment Configuration
Copy `.env.example` to `.env` and populate:
- `GCP_PROJECT_ID=rfpengine`
- `GOOGLE_APPLICATION_CREDENTIALS=gcp-key.json`
- `LLM_PROVIDER=vertexai`, `GEMINI_MODEL=gemini-2.5-flash`, `VERTEX_EMBEDDING_MODEL=text-embedding-004`
- `DATABASE_URL=postgresql://neondb_owner:password@ep-...neon.tech/neondb?sslmode=require`
- `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX_NAME=rfp_knowledge_base`
- `PINECONE_API_KEY`, `PINECONE_INDEX=rfp-knowledge-base`, `PINECONE_CLOUD=aws`, `PINECONE_REGION=us-east-1`

### 2. Start Local PostgreSQL Database
Run `docker-compose up -d`

### 3. Initialize Virtual Environment & Migrations
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m alembic upgrade head
cd ..

### 4. Database, Seeding, Cloud Diagnostics & Secrets Tooling
- `npm run seed`: Seed sample documents across PostgreSQL, Algolia, and Pinecone
- `npm run test:cloud`: Verify live cloud connections
- `npm run secrets:audit`: Audit GCP Secret Manager against project secrets
- `npm run secrets:sync`: Sync local `.env` to GCP Secret Manager
- `npm test`: Run all backend tests

### 5. Start Backend
cd backend && uvicorn app.main:app --reload --port 8000

### 6. Start Frontend
cd frontend && npm install && npm run dev
Open http://localhost:5173/

---

## 🧪 Testing & Code Quality Assurance

RFPEngine enforces strict engineering rigor across frontend and backend codebases:

### 1. Frontend Modular Architecture & Component Line Limit (≤ 100 Lines)
* **Strict Line Limit**: Every React component (`.tsx`) is strictly bounded to **$\le$ 100 lines** to maintain readability and eliminate monolithic anti-patterns.
* **Domain Hook Decomposition**: The state layer is decomposed into single-responsibility custom hooks under `frontend/src/hooks/`:
  * `useNavigationRouter`: Client-side routing, URL synchronization, and active ID parsing.
  * `useDocumentIngestion`: File upload, parsing progress, and parser guidance feedback loops.
  * `useQuestionnaireWorkflow`: Review status transitions, role governance, and answer persistence.
  * `useAiAnswerGenerator`: Grounded question generation and batch answering with fallback resilience.
  * `useKnowledgeBaseManager`: Document vector management, live search playground, and connectors.
  * `useWorkspaceListManager`: Questionnaire listing, duplication, deletion, and deliverable export.
  * `useWorkspaceSettingsManager`: Tenant profile, AI tuning, and settings persistence.
  * `useActivityAndAudit`: System health telemetry, audit event logging, and toast notifications.
  * `useReviewGovernanceState`: Modal states and role routing for SME and Legal approvals.

### 2. Frontend Test Suite & Code Coverage
Built-in Node 22 native test runner (`node:test`, `node:assert`) bundled via esbuild with experimental code coverage:
```bash
npm --prefix frontend test
```
* **Coverage**: **>99% line coverage**, **>94% branch coverage**, **>97% function coverage**.

### 3. Backend Test Suite
Automated test suite using `pytest` and `pytest-asyncio` with offline database isolation:
```bash
backend/.venv/bin/pytest backend/tests/ -v
```
* **Coverage**: 70 passing tests covering hybrid search, Algolia indexing, CSV/Excel/PDF parsing, feedback telemetry, and MCP server endpoints.

---

## ☁️ GCP Deployment & Secrets Management with Terraform

### Managing Secrets

1. Update `terraform/terraform.tfvars`:
   database_url = "postgresql://neondb_owner:NEW_PW@ep-...neon.tech/neondb?sslmode=require"
   algolia_app_id = "YOUR_APP_ID"
   algolia_api_key = "NEW_KEY"
   pinecone_api_key = "NEW_KEY"

2. Preview & Apply:
   npm run tf:plan
   npm run tf:apply

### Complete GCP Deployment Workflow
1. Provision Infrastructure:
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   npm run tf:init && npm run tf:apply

2. Build & Deploy Backend:
   cd ../backend
   gcloud builds submit --tag "us-central1-docker.pkg.dev/rfpengine/rfpengine-repo/backend:latest" .
   gcloud run deploy rfpengine-api --image "us-central1-docker.pkg.dev/rfpengine/rfpengine-repo/backend:latest" --region "us-central1"

---

## 📂 Project Structure

├── docker-compose.yml
├── terraform/                      # IaC for GCP, Secrets, Cloud Run, Artifact Registry
├── docs/adr/                       # Architecture Decision Records
├── backend/
│   ├── Dockerfile
│   ├── alembic/                    # Database migrations
│   ├── app/
│   │   ├── api/                    # Health, knowledge base, responses, search, MCP routes
│   │   ├── core/                   # DB, settings, config
│   │   ├── mcp/                    # Model Context Protocol server & tools
│   │   ├── models/                 # SQLAlchemy & Pydantic models
│   │   └── services/               # Parsers, connectors, hybrid search, LLM reasoning
│   ├── tests/                      # Automated test suite
│   └── scripts/                    # Seeding, cloud connection, secret sync scripts
├── frontend/                       # React 18 / Tailwind Workspace
└── extension/                      # Manifest V3 Browser Extension