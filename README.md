# RFPEngine

**RFPEngine** is an AI-assisted seller-side RFP (Request for Proposal) and vendor security questionnaire response assistant. It retrieves verified answers from a tenant knowledge base using **hybrid search** (**Elasticsearch** for BM25 keyword matching and **Pinecone** for dense vector similarity), persists canonical records and review lifecycles in **PostgreSQL**, drafts grounded responses with OpenAI, and empowers sellers to review, approve, and insert answers directly into buyer questionnaires via a **Manifest V3 browser extension**.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Clients ["Clients"]
        FE[React Seller Workspace]
        EXT[Manifest V3 Browser Extension]
    end

    subgraph FastAPI ["FastAPI Backend (backend/app)"]
        API[API Endpoints: /search, /knowledge-base, /workspaces, /health]
        HS[HybridSearchService]
        RRF[Reciprocal Rank Fusion (RRF)]
        PG_SVC[PostgresService]
        ES_SVC[ElasticsearchService]
        PC_SVC[PineconeService]
    end

    subgraph DataStores ["Data & AI Services"]
        PG[(PostgreSQL 16\nCanonical Store)]
        ES[(Elasticsearch 8\nBM25 Sparse)]
        PC[(Pinecone\nDense Vector k-NN)]
        OAI[OpenAI\ngpt-4o & Embeddings]
    end

    FE -->|HTTP / JSON| API
    EXT -->|HTTP / JSON| API

    API --> HS
    API --> PG_SVC
    
    HS -->|Generate Query Vector| OAI
    HS -->|1. Sparse Keyword Match| ES_SVC
    HS -->|2. Dense Vector k-NN| PC_SVC
    ES_SVC --> ES
    PC_SVC --> PC
    
    ES_SVC & PC_SVC --> RRF
    RRF -->|3. Grounded Sources| OAI
    OAI -->|4. Suggested Answer| HS
    
    PG_SVC --> PG
```

---

## Architecture Decision Records (ADRs)

Key architectural decisions are documented in the [`docs/adr/`](docs/adr/README.md) directory:

- [ADR 0001: Hybrid Search with Elasticsearch and Pinecone via Reciprocal Rank Fusion](docs/adr/0001-hybrid-retrieval-with-elasticsearch-and-pinecone.md)
- [ADR 0002: Relational Persistence with PostgreSQL for Canonical Records and Review Tracking](docs/adr/0002-relational-persistence-with-postgresql.md)
- [ADR 0003: Human-in-the-Loop Governance, Multi-Role Approval, and Form Insertion Safety](docs/adr/0003-human-in-the-loop-governance-and-extension-safety.md)
- [ADR 0004: Decoupled Seller Workspace and Manifest V3 Browser Extension Architecture](docs/adr/0004-decoupled-seller-workspace-and-browser-extension.md)
- [ADR 0005: Database Migrations with Alembic](docs/adr/0005-database-migrations-with-alembic.md)

---

## Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: 20 or newer and `npm`
- **Docker & Docker Compose**: For local PostgreSQL and Elasticsearch
- **OpenAI API Key**: For vector embeddings (`text-embedding-3-small`) and answer drafting (`gpt-4o`)
- **Pinecone API Key**: For managed dense vector search
- **Browser**: Google Chrome or Microsoft Edge (for loading the extension POC)

---

## Quickstart

### 1. Environment Configuration

From the repository root:

```bash
cp .env.example .env
```

Configure the environment variables in `.env`:

```ini
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o

# PostgreSQL Configuration
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/rfpengine

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=rfq_knowledge_base

# Pinecone Configuration
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=rfq-knowledge-base
PINECONE_ENVIRONMENT=us-east-1

# CORS & Server
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
```

### 2. Start PostgreSQL & Elasticsearch

Launch the local datastores with Docker Compose:

```bash
docker-compose up -d
```

Verify services are accessible:
- **PostgreSQL**: `localhost:5432` (database `rfpengine`, user/pass `postgres`/`postgres`)
- **Elasticsearch**: `http://localhost:9200`

### 3. Initialize & Seed Backend Services

Create a Python virtual environment, install dependencies, initialize schemas, and seed baseline RFP knowledge records:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run database migrations (or init tables)
python3 -m alembic upgrade head
# Alternatively: python3 scripts/init_services.py

# Seed sample approved RFP response records (security, data retention, SLAs, SOC 2)
python3 scripts/seed_data.py
cd ..
```

### Database Migrations (Alembic)

To manage database schema changes over time:

```bash
# Apply pending migrations
npm run db:migrate
# or: cd backend && python3 -m alembic upgrade head

# Generate a new migration after modifying models in backend/app/models/db_models.py
npm run db:revision -- -m "add_new_feature_table"
# or: cd backend && python3 -m alembic revision --autogenerate -m "add_new_feature_table"
```

### 4. Start the FastAPI Backend

From the `backend/` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

Check system health across all connected services:

```bash
curl http://localhost:8000/health
```

### 5. Start the React Frontend Workspace

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). The frontend automatically proxies `/api` requests to `http://localhost:8000`.

### 6. Load the Browser Extension POC

1. Keep the frontend running and open the test fixture: [http://localhost:5173/mock-questionnaire.html](http://localhost:5173/mock-questionnaire.html).
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Toggle **Developer mode** on (top-right switch).
4. Click **Load unpacked** and select the repository's `extension/` directory.
5. In the mock questionnaire tab, open the extension side panel by clicking the RFPEngine extension icon.
6. Click **Scan page** to detect form fields.
7. Click **Generate all answers** to retrieve grounded suggestions with confidence scores and citations.
8. Review the suggestions, click **Approve**, and click **Insert answer** (or **Insert approved answers**) to populate the form fields.

---

## API Reference

### 1. Hybrid Search & Answer Generation
- **`POST /api/v1/search`**
  - Concurrently queries Elasticsearch (BM25) and Pinecone (dense vector k-NN).
  - Merges hits with Reciprocal Rank Fusion (RRF).
  - Drafts grounded answer with OpenAI `gpt-4o`.
  - **Request Body**:
    ```json
    {
      "tenant_id": "acme-corp",
      "question": "Describe your data retention policy.",
      "top_k": 5
    }
    ```
  - **Response**:
    ```json
    {
      "suggested_answer": "Customer data is retained for the duration of the active subscription...",
      "confidence_score": 0.94,
      "sources": [
        {
          "id": "kb-2048",
          "question": "How long is customer data retained after account termination?",
          "answer": "Customer data is retained for 30 days...",
          "score": 0.0323,
          "source_type": "elasticsearch+pinecone"
        }
      ]
    }
    ```

### 2. Knowledge Base Management
- **`GET /api/v1/knowledge-base?tenant_id=acme-corp`**: List all canonical knowledge records for a tenant.
- **`GET /api/v1/knowledge-base/{id}`**: Get a specific knowledge record.
- **`POST /api/v1/knowledge-base`**: Create a new record in PostgreSQL and automatically sync to Elasticsearch and Pinecone.
- **`POST /api/v1/knowledge-base/batch`**: Batch import multiple records and sync.
- **`DELETE /api/v1/knowledge-base/{id}`**: Remove a record from PostgreSQL, Elasticsearch, and Pinecone.

### 3. Workspaces & Review Persistence
- **`POST /api/v1/workspaces`**: Save an imported questionnaire workspace and its questions to PostgreSQL.
- **`GET /api/v1/workspaces/{id}`**: Retrieve a workspace session and its review stages.
- **`PATCH /api/v1/workspaces/{id}/questions/{question_index}`**: Update review status, assigned role, or edited answer for a specific question.

### 4. Health & Diagnostics
- **`GET /health`**: Returns real-time connection status and latency metrics for PostgreSQL, Elasticsearch, Pinecone, and OpenAI.

---

## Multi-Role Review Workflow

```text
Draft ──► SME Review ──► Approved by SME ──► Final Approval ──► Inserted
```

1. **Proposal Manager**: Imports questionnaires from URLs or files (HTML/JSON/CSV), reviews detected questions, and assigns domain areas to reviewers.
2. **SME Reviewer (Security, Product, Tech)**: Reviews draft answers, inspects cited knowledge base sources, refines technical wording, and approves or requests changes.
3. **Legal Reviewer**: Reviews regulatory, privacy, retention, and contractual questions to ensure approved legal phrasing.
4. **Final Approver**: Inspects the consolidated questionnaire, verifies required reviews are complete, and unlocks the response for final insertion.
5. **Submitter**: Populates approved answers into the buyer questionnaire via the browser extension and manually submits the form on the buyer portal.

> [!IMPORTANT]
> **Safety Guarantee**: RFPEngine never automatically submits a buyer questionnaire. Only explicitly approved answers are inserted into form fields, and final submission is always performed by the human seller.

---

## Project Structure

```text
├── docker-compose.yml              # Local PostgreSQL 16 & Elasticsearch 8 containers
├── docs/
│   └── adr/                        # Architecture Decision Records
│       ├── README.md               # ADR Index
│       ├── 0001-hybrid-retrieval-with-elasticsearch-and-pinecone.md
│       ├── 0002-relational-persistence-with-postgresql.md
│       ├── 0003-human-in-the-loop-governance-and-extension-safety.md
│       └── 0004-decoupled-seller-workspace-and-browser-extension.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py           # /health diagnostic endpoint
│   │   │   ├── knowledge_base.py   # /api/v1/knowledge-base CRUD & sync
│   │   │   ├── responses.py        # /api/v1/workspaces persistence
│   │   │   └── search.py           # /api/v1/search hybrid RRF retrieval
│   │   ├── core/
│   │   │   ├── config.py           # Settings and env validation
│   │   │   └── db.py               # Async SQLAlchemy PostgreSQL connection
│   │   ├── models/
│   │   │   ├── db_models.py        # SQLAlchemy relational models
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── elasticsearch_service.py # Elasticsearch BM25 sparse search
│   │   │   ├── pinecone_service.py      # Pinecone dense vector similarity search
│   │   │   ├── postgres_service.py      # PostgreSQL database operations
│   │   │   └── hybrid_search_service.py # RRF fusion & OpenAI generation
│   │   └── main.py                 # FastAPI application factory and lifespan
│   ├── scripts/
│   │   ├── init_services.py        # DB schema and index setup script
│   │   └── seed_data.py            # Sample RFP data seed script
│   └── requirements.txt
├── frontend/                       # React seller workspace
└── extension/                      # Manifest V3 browser extension
```
