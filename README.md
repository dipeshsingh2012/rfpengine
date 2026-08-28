# RFPEngine

**RFPEngine** is an AI-assisted seller-side RFP (Request for Proposal) and vendor security questionnaire response assistant. It retrieves verified answers from a tenant knowledge base using **hybrid search** (**Elasticsearch** for BM25 keyword matching and **Pinecone Serverless** for dense vector similarity), manages knowledge documents with **300–500 token chunking**, persists canonical review lifecycles in **PostgreSQL** (Neon), manages cloud secrets via **GCP Secret Manager**, drafts grounded responses with **Google Cloud Vertex AI** (`gemini-2.5-flash` & `text-embedding-004`), and empowers sellers to review, approve, and insert answers directly into buyer questionnaires via a **Manifest V3 browser extension**.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Clients ["Clients"]
        FE[React Seller Workspace\n& Knowledge Base Manager]
        EXT[Manifest V3 Browser Extension]
    end

    subgraph IngestionPipeline ["Knowledge Ingestion & Chunking"]
        UPLOAD["POST /api/v1/knowledge-base/upload\n(.csv, .json, .pdf, .docx, .txt, .md)"]
        PARSER["DocumentParserService\n(300–500 Token Chunking)"]
        UPLOAD --> PARSER
    end

    subgraph GCPCloudRun ["Google Cloud Run (FastAPI Backend)"]
        API[API Endpoints: /search, /knowledge-base, /workspaces, /health]
        HS[HybridSearchService]
        RRF[Reciprocal Rank Fusion (RRF)]
        PG_SVC[PostgresService]
        ES_SVC[ElasticsearchService]
        PC_SVC[PineconeService]
    end

    subgraph Security ["Secrets Management"]
        GSM[GCP Secret Manager\n(Database URL, Elastic & Pinecone Keys)]
    end

    subgraph SearchIndexes ["Search & Chunk Storage (Dual Index)"]
        ES[(Elasticsearch 8 / Elastic Cloud\nBM25 Sparse Keyword Match\n+ Full Chunk Text Store)]
        PC[(Pinecone Serverless\n768-dim Dense Vector k-NN\nCosine Metric + Metadata)]
        VAI[Google Cloud Vertex AI\ntext-embedding-004 & gemini-2.5-flash]
    end

    subgraph RelationalStore ["Relational Persistence (PostgreSQL)"]
        PG[(Neon PostgreSQL 17\nWorkspaces & Question Reviews)]
    end

    FE -->|HTTP / JSON / Upload| API
    EXT -->|HTTP / JSON| API
    GSM -->|Native Injection at Boot| GCPCloudRun

    PARSER -->|1. Store Full Text & BM25| ES_SVC
    PARSER -->|2. Generate 768-dim Embeddings| VAI
    VAI -->|3. Bulk Upsert Vectors + Meta| PC_SVC
    ES_SVC --> ES
    PC_SVC --> PC

    API --> HS
    API --> PG_SVC
    
    HS -->|Generate Query Vector| VAI
    HS -->|Sparse Keyword Match| ES_SVC
    HS -->|Dense Vector k-NN| PC_SVC
    
    ES_SVC & PC_SVC --> RRF
    RRF -->|Grounded Sources| VAI
    VAI -->|Drafted Response| HS
    
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
- [ADR 0006: Centralized Secrets Management with GCP Secret Manager and Terraform](docs/adr/0006-centralized-secrets-management-with-gcp-secret-manager.md)
- [ADR 0007: Multi-Format Knowledge Base Ingestion and Search-Index-Only Chunking Strategy](docs/adr/0007-knowledge-base-chunking-and-search-index-ingestion.md)
- [ADR 0008: Native Google Cloud Vertex AI (Gemini 2.5 Flash and text-embedding-004) for Enterprise Inference](docs/adr/0008-native-gcp-vertex-ai-gemini-and-embeddings.md)
- [ADR 0009: Passage-Based Document Ingestion and LLM Question-Answering Reasoning](docs/adr/0009-passage-based-document-ingestion-and-llm-reasoning.md)

---

## Product & Engineering Backlog

Future roadmap items and upcoming architecture enhancements are tracked in [`docs/BACKLOG.md`](docs/BACKLOG.md):
- **LLM-Powered Background Taxonomy Classification**: Asynchronously tag document categories and regulatory frameworks (`SOC 2`, `ISO 27001`, `GDPR`, `HIPAA`) using fast LLMs (`gemini-2.5-flash-lite`).
- **Neural Cross-Encoder Reranking**: Cohere Rerank v3 integration on top of RRF.
- **Direct Spreadsheet & PDF Questionnaire Parser**: Ingestion of multi-tab Excel (`.xlsx`) buyer questionnaires.
- **Grounded Hallucination Guardrails**: Automated claim verification against retrieved source citations.

---

## Knowledge Base Ingestion & Passage Chunking

RFPEngine ingests arbitrary enterprise documentation (whitepapers, contracts, SLAs, technical manuals, employee handbooks) and chunks them into semantic **narrative passages**, leaving question-to-passage reasoning to **Gemini 2.5 Flash**:

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
* **Storage Synchronization**: Passage chunks are synchronized idempotently across **PostgreSQL** (`kb_entries`), **Elastic Cloud** (BM25 sparse search), and **Pinecone Serverless** (dense vector k-NN).

---

## Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: 20 or newer and `npm`
- **Terraform**: 1.5 or newer (for GCP infrastructure provisioning)
- **Google Cloud SDK (`gcloud`)**: For managing Vertex AI and Cloud Run
- **GCP Service Account Key (`gcp-key.json`)**: For local ADC authentication with Vertex AI and Secret Manager
- **Neon PostgreSQL Connection String**: Cloud database URL
- **Pinecone API Key**: For managed dense vector search (`aws / us-east-1`)
- **Browser**: Google Chrome or Microsoft Edge (for loading the extension POC)

---

## Quickstart (Local Development)

### 1. Environment Configuration

From the repository root:

```bash
cp .env.example .env
```

Configure your `.env` file:

```ini
# Environment ("dev", "staging", "prod")
ENV=dev

# Google Cloud Project & IAM
GCP_PROJECT_ID=rfpengine
GCP_SECRET_MANAGER_ENABLED=true
GOOGLE_APPLICATION_CREDENTIALS=gcp-key.json

# LLM & Embedding Configuration (Vertex AI Native)
LLM_PROVIDER=vertexai
GEMINI_MODEL=gemini-2.5-flash
VERTEX_EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSION=768

# Optional OpenAI Fallback
# OPENAI_API_KEY=sk-proj-...

# Neon PostgreSQL Database
DATABASE_URL=postgresql://neondb_owner:your_password@ep-rapid-truth-aqw82ysi-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require

# Elasticsearch / Elastic Cloud Configuration
ELASTICSEARCH_URL=http://localhost:9200
# For Elastic Cloud (supply API key):
# ELASTICSEARCH_URL=https://my-deployment.es.us-central1.gcp.elastic.cloud:443
# ELASTICSEARCH_API_KEY=your_elastic_api_key
ELASTICSEARCH_INDEX=rfq_knowledge_base

# Pinecone Serverless Configuration
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=rfq-knowledge-base
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
PINECONE_DIMENSION=768

# CORS & Server
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
```

### 2. Start Local Elasticsearch (Optional if using Elastic Cloud)

```bash
docker-compose up -d
```

### 3. Initialize Database Migrations & Virtual Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run Alembic database migrations against Neon PostgreSQL
python3 -m alembic upgrade head
cd ..
```

### 4. Database, Seeding, Cloud Diagnostics & Secrets Tooling

```bash
# Idempotently seed knowledge base sample docs across PostgreSQL, Elastic Cloud, and Pinecone
npm run seed

# Run live Cloud Diagnostics across PostgreSQL, Elastic Cloud, Pinecone, and Vertex AI
npm run test:cloud

# Audit GCP Secret Manager against canonical project secrets
npm run secrets:audit

# Sync local .env secrets to GCP Secret Manager
npm run secrets:sync

# Run all backend tests (Document Parser, PostgreSQL, Uploads)
npm test

# Run PostgreSQL connection and CRUD test suite specifically
npm run test:db

# Apply pending Alembic migrations
npm run db:migrate

# Generate a new migration revision after modifying models in backend/app/models/db_models.py
npm run db:revision -- -m "add_new_feature_table"
```

### 5. Start the FastAPI Backend

From `backend/`:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify health status:

```bash
curl http://localhost:8000/health
```

### 6. Start the React Frontend Workspace

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). Click **Knowledge base** in the sidebar to open the file drag-and-drop uploader.

---

## GCP Deployment & Secrets Management with Terraform

All cloud infrastructure — including **Google Cloud Secret Manager secrets**, **Cloud Run v2**, **IAM Service Accounts**, and **Artifact Registry** — is managed declaratively via **Terraform** in the [`terraform/`](terraform/) directory.

---

### Managing Secrets with Terraform & GCP Secret Manager

All sensitive credentials (`DATABASE_URL`, `ELASTICSEARCH_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`) are declared as sensitive variables in Terraform, securely provisioned in **Google Cloud Secret Manager**, and automatically injected into Cloud Run at container boot via `version = "latest"`.

#### 1. How to Update or Rotate an Existing Secret

When you update credentials (e.g. rotating a Neon database password, Elastic Cloud API Key, or OpenAI token):

1. Open your local `terraform/terraform.tfvars` file (which is gitignored):
   ```hcl
   # terraform/terraform.tfvars
   database_url          = "postgresql://neondb_owner:NEW_PASSWORD@ep-rapid-truth-...neon.tech/neondb?sslmode=require"
   elasticsearch_url     = "https://my-deployment.es.us-central1.gcp.elastic.cloud:443"
   elasticsearch_api_key = "NEW_ELASTIC_API_KEY"
   openai_api_key        = "sk-proj-NEW_OPENAI_KEY..."
   pinecone_api_key      = "pcsk_NEW_PINECONE_KEY..."
   ```

2. **Preview the Changes**:
   ```bash
   npm run tf:plan
   ```
   Terraform will show: `+ resource "google_secret_manager_secret_version" ... will be created`.

3. **Apply the Update**:
   ```bash
   npm run tf:apply
   ```

4. **Zero-Downtime Secret Propagation**:
   - Terraform automatically creates a **new immutable secret version** in GCP Secret Manager (e.g. Version 2).
   - Because Cloud Run is configured with `version = "latest"`, it automatically re-deploys a new revision using the latest secret value without any downtime.

> [!TIP]
> **Single Secret Update via CLI**: You can also update a single secret without modifying `terraform.tfvars` by passing the `-var` flag:
> ```bash
> npm run tf:apply -- -var="openai_api_key=sk-proj-NEW_KEY_HERE"
> ```

👉 **View Active Secrets & Versions**: [Google Cloud Secret Manager Console](https://console.cloud.google.com/security/secret-manager?project=rfpengine)

---

#### 2. How to Add a Brand New Secret (Step-by-Step)

If you introduce a new third-party service (e.g. `COHERE_API_KEY` or `SLACK_WEBHOOK_URL`):

1. **Declare the Variable** in [`terraform/variables.tf`](terraform/variables.tf):
   ```hcl
   variable "cohere_api_key" {
     type        = string
     description = "Cohere API key for reranking"
     sensitive   = true
     default     = ""
   }
   ```

2. **Define the Secret Manager Resource** in [`terraform/secrets.tf`](terraform/secrets.tf):
   ```hcl
   resource "google_secret_manager_secret" "cohere_api_key" {
     secret_id = "${var.app_name}-cohere-api-key"
     replication {
       auto {}
     }
     depends_on = [google_project_service.enabled_apis]
   }

   resource "google_secret_manager_secret_version" "cohere_api_key_val" {
     count       = var.cohere_api_key != "" ? 1 : 0
     secret      = google_secret_manager_secret.cohere_api_key.id
     secret_data = var.cohere_api_key
   }
   ```

3. **Grant IAM Access to Cloud Run** in [`terraform/iam.tf`](terraform/iam.tf):
   ```hcl
   resource "google_secret_manager_secret_iam_member" "cohere_key_access" {
     secret_id = google_secret_manager_secret.cohere_api_key.id
     role      = "roles/secretmanager.secretAccessor"
     member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
   }
   ```

4. **Mount Secret as Environment Variable** in [`terraform/cloud_run.tf`](terraform/cloud_run.tf):
   ```hcl
   dynamic "env" {
     for_each = var.cohere_api_key != "" ? [1] : []
     content {
       name = "COHERE_API_KEY"
       value_source {
         secret_key_ref {
           secret  = google_secret_manager_secret.cohere_api_key.secret_id
           version = "latest"
         }
       }
     }
   }
   ```

5. **Set the Value & Apply**:
   Add `cohere_api_key = "..."` in `terraform/terraform.tfvars` and run `npm run tf:apply`.

---

### Complete GCP Deployment Workflow

#### 1. Initial Infrastructure Provisioning

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in project_id, database_url (Neon), credentials_file ("../gcp-key.json")

# Initialize and preview
npm run tf:init
npm run tf:plan

# Provision GCP Secret Manager, Cloud Run, Artifact Registry, and IAM
npm run tf:apply
```

#### 2. Build & Push Backend Container to Artifact Registry

```bash
# Retrieve variables from Terraform outputs
PROJECT_ID="rfpengine"
REGION="us-central1"
REPO_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/rfpengine-repo"

# Build and Push Container Image to Google Artifact Registry
cd ../backend
gcloud builds submit --tag "${REPO_URL}/backend:latest" .

# Update Cloud Run to deploy the pushed image
gcloud run deploy rfpengine-api \
  --image "${REPO_URL}/backend:latest" \
  --region "${REGION}"
```

---

## Frontend Routes & Pages

The React single-page application (`frontend/`) provides dedicated routes for questionnaire ingestion, AI-assisted drafting, multi-stakeholder governance, and knowledge base file uploads:

| Route Path | Page / View Name | Primary Features & User Workflows |
| :--- | :--- | :--- |
| **`GET /`** | **Overview & Importer** | • Import buyer questionnaires via URL or file upload (`.csv`, `.json`, `.pdf`, `.docx`)<br>• Quick-start with pre-configured starter questions<br>• Summary dashboard of recent RFP projects |
| **`GET /response/workspace/:id`** | **Interactive Drafting Workspace** | • Split-pane drafting view with real-time AI answer generation (`gpt-4o`)<br>• Visual confidence scoring ring (0–100%)<br>• Cited hybrid sources from Elasticsearch (BM25) and Pinecone (Dense Vectors)<br>• In-line answer editor, review status transitions, and reviewer role assignment |
| **`GET /review/:id`** | **Question Review & Governance** | • Multi-question review queue with role switcher (`Proposal manager`, `Security SME`, `Legal reviewer`, `Final approver`)<br>• Approval state machine badges (`Draft`, `SME review`, `Approved by SME`, `Legal review`, `Approved by Legal`, `Final approved`, `Rejected`)<br>• Question search and filtering<br>• Export approved answers to CSV or automated handoff to buyer form |
| **`GET /knowledge-base`** | **Knowledge Base Ingestion** | • Drag-and-drop multi-format file uploader (`.csv`, `.tsv`, `.json`, `.jsonl`, `.pdf`, `.docx`, `.txt`, `.md`)<br>• 300–500 token chunking with automatic taxonomy categorization<br>• Single-click demo sample downloads (`/sample_docs/`)<br>• Clean table of indexed knowledge chunks with single-click deletion |
| **`GET /playground`** | **Retrieval & Search Playground** | • Interactive query testing against Elasticsearch (BM25) and Pinecone (Dense Vectors)<br>• Real-time Reciprocal Rank Fusion (RRF) score inspection and hit breakdown<br>• Live AI answer generation (`gpt-4o`) with radial confidence scoring<br>• Quick-click sample test questions for live demonstrations |

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

### 2. Knowledge Base Management & Ingestion
- **`POST /api/v1/knowledge-base/upload`**: Multipart file upload (`.csv`, `.tsv`, `.json`, `.jsonl`, `.pdf`, `.docx`, `.txt`, `.md`). Applies 300–500 token chunking and indexes into Elasticsearch (BM25 + text storage) and Pinecone (dense vectors).
- **`GET /api/v1/knowledge-base?tenant_id=acme-corp`**: List indexed knowledge records from Elasticsearch.
- **`GET /api/v1/knowledge-base/{id}`**: Get a specific knowledge record.
- **`POST /api/v1/knowledge-base`**: Create a single record in Elasticsearch and Pinecone.
- **`POST /api/v1/knowledge-base/batch`**: Batch import multiple records into Elasticsearch and Pinecone.
- **`DELETE /api/v1/knowledge-base/{id}`**: Remove a record from Elasticsearch and Pinecone.

### 3. Workspaces & Review Persistence (PostgreSQL)
- **`POST /api/v1/workspaces`**: Save an imported questionnaire workspace and its questions to PostgreSQL.
- **`GET /api/v1/workspaces/{id}`**: Retrieve a workspace session and its review stages.
- **`PATCH /api/v1/workspaces/{id}/questions/{question_index}`**: Update review status, assigned role, or edited answer for a specific question.

### 4. Health & Diagnostics
- **`GET /health`**: Returns real-time connection status and latency metrics for PostgreSQL, Elasticsearch, Pinecone, GCP Secret Manager, and OpenAI.

---

## Project Structure

```text
├── docker-compose.yml              # Local Elasticsearch container
├── terraform/                      # Infrastructure as Code (GCP & Cloud Run)
│   ├── main.tf                     # Provider & GCP API enablement
│   ├── variables.tf                # Parameter declarations
│   ├── secrets.tf                  # GCP Secret Manager resources
│   ├── iam.tf                      # Cloud Run Service Account & Secret Accessor IAM
│   ├── cloud_run.tf                # Cloud Run v2 service & Artifact Registry
│   ├── outputs.tf                  # Public API URL & repo outputs
│   └── terraform.tfvars.example    # Sample configuration values
├── docs/
│   └── adr/                        # Architecture Decision Records
│       ├── README.md               # ADR Index
│       ├── 0001-hybrid-retrieval-with-elasticsearch-and-pinecone.md
│       ├── 0002-relational-persistence-with-postgresql.md
│       ├── 0003-human-in-the-loop-governance-and-extension-safety.md
│       ├── 0004-decoupled-seller-workspace-and-browser-extension.md
│       ├── 0005-database-migrations-with-alembic.md
│       ├── 0006-centralized-secrets-management-with-gcp-secret-manager.md
│       └── 0007-knowledge-base-chunking-and-search-index-ingestion.md
├── backend/
│   ├── Dockerfile                  # Production container for Cloud Run
│   ├── alembic/                    # Database migration versions
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py           # /health diagnostic endpoint
│   │   │   ├── knowledge_base.py   # /api/v1/knowledge-base CRUD & /upload
│   │   │   ├── responses.py        # /api/v1/workspaces persistence
│   │   │   └── search.py           # /api/v1/search hybrid RRF retrieval
│   │   ├── core/
│   │   │   ├── config.py           # Settings and env validation
│   │   │   └── db.py               # Async SQLAlchemy PostgreSQL connection
│   │   ├── models/
│   │   │   ├── db_models.py        # SQLAlchemy relational models
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── document_parser_service.py # Multi-format parser & 300-500 token chunker
│   │   │   ├── elasticsearch_service.py   # Elasticsearch BM25 search & text store
│   │   │   ├── gcp_secret_service.py      # Google Cloud Secret Manager client
│   │   │   ├── pinecone_service.py        # Pinecone dense vector similarity search
│   │   │   ├── postgres_service.py        # PostgreSQL database operations
│   │   │   └── hybrid_search_service.py   # RRF fusion & OpenAI generation
│   │   └── main.py                 # FastAPI application factory and lifespan
│   ├── tests/
│   │   ├── conftest.py             # Pytest async session fixtures
│   │   ├── test_document_parser.py # Document parsing & upload tests
│   │   └── test_postgres_connection.py # Production PostgreSQL validation suite
│   ├── scripts/
│   │   ├── gcp_secrets_sync.py     # CLI sync to GCP Secret Manager
│   │   ├── verify_cloud_connections.py # Live Cloud diagnostics CLI
│   │   ├── init_services.py        # DB schema and index setup script
│   │   └── seed_data.py            # Sample RFP data seed script
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/                       # React seller workspace & KB library modal
└── extension/                      # Manifest V3 browser extension
```
