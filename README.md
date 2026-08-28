# RFPEngine

**RFPEngine** is an AI-assisted seller-side RFP (Request for Proposal) and vendor security questionnaire response assistant. It retrieves verified answers from a tenant knowledge base using **hybrid search** (**Elasticsearch** for BM25 keyword matching and **Pinecone** for dense vector similarity), persists canonical records and review lifecycles in **PostgreSQL** (e.g. Neon), manages secrets via **GCP Secret Manager**, drafts grounded responses with OpenAI, and empowers sellers to review, approve, and insert answers directly into buyer questionnaires via a **Manifest V3 browser extension**.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Clients ["Clients"]
        FE[React Seller Workspace]
        EXT[Manifest V3 Browser Extension]
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
        GSM[GCP Secret Manager\n(Database URL, OpenAI & Pinecone Keys)]
    end

    subgraph DataStores ["Data & AI Services"]
        PG[(Neon PostgreSQL 16\nCanonical Store)]
        ES[(Elasticsearch 8\nBM25 Sparse)]
        PC[(Pinecone\nDense Vector k-NN)]
        OAI[OpenAI\ngpt-4o & Embeddings]
    end

    FE -->|HTTP / JSON| API
    EXT -->|HTTP / JSON| API
    GSM -->|Native Injection at Boot| GCPCloudRun

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
- [ADR 0006: Centralized Secrets Management with GCP Secret Manager and Terraform](docs/adr/0006-centralized-secrets-management-with-gcp-secret-manager.md)

---

## Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: 20 or newer and `npm`
- **Terraform**: 1.5 or newer (for GCP infrastructure provisioning)
- **Docker & Docker Compose**: For local development
- **Neon PostgreSQL Connection String**: Cloud database URL
- **OpenAI API Key**: For vector embeddings (`text-embedding-3-small`) and answer drafting (`gpt-4o`)
- **Pinecone API Key**: For managed dense vector search
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
# Neon PostgreSQL Database
DATABASE_URL=postgresql://neondb_owner:your_password@ep-rapid-truth-aqw82ysi-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=rfq_knowledge_base

# Pinecone Configuration
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=rfq-knowledge-base

# CORS & Server
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
```

### 2. Start Local Elasticsearch

```bash
docker-compose up -d
```

### 3. Initialize Database Migrations & Seed Baseline Data

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run Alembic database migrations against Neon PostgreSQL
python3 -m alembic upgrade head

# Seed standard RFP knowledge records
python3 scripts/seed_data.py
cd ..
```

### Database Migrations (Alembic)

```bash
# Apply pending migrations
npm run db:migrate

# Generate a new migration revision after modifying models in backend/app/models/db_models.py
npm run db:revision -- -m "add_new_feature_table"
```

### 4. Start the FastAPI Backend

From `backend/`:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify health status:

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

Open [http://localhost:5173/](http://localhost:5173/).

---

## GCP Deployment & Secrets Management with Terraform

All cloud infrastructure — including **Google Cloud Secret Manager secrets**, **Cloud Run v2**, **IAM Service Accounts**, and **Artifact Registry** — is managed declaratively via **Terraform** in the [`terraform/`](terraform/) directory.

---

### Managing Secrets with Terraform

All sensitive credentials (`DATABASE_URL`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, etc.) are declared as sensitive variables in Terraform, provisioned in GCP Secret Manager, and injected directly into Cloud Run at container boot.

#### 1. How to Update or Rotate an Existing Secret

To update a database password, OpenAI key, or Pinecone API key:

1. Open `terraform/terraform.tfvars` (or pass `-var="variable_name=new_value"`).
2. Update the variable value:
   ```hcl
   # terraform/terraform.tfvars
   database_url   = "postgresql://neondb_owner:NEW_PASSWORD@ep-rapid-truth-...neon.tech/neondb?sslmode=require"
   openai_api_key = "sk-proj-NEW_OPENAI_KEY..."
   ```
3. Apply the Terraform update:
   ```bash
   npm run tf:apply
   # or: cd terraform && terraform apply
   ```
4. **Zero Downtime**: Terraform creates a new secret version in GCP Secret Manager and automatically triggers a new Cloud Run revision using the latest secret value.

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
│       └── 0006-centralized-secrets-management-with-gcp-secret-manager.md
├── backend/
│   ├── Dockerfile                  # Production container for Cloud Run
│   ├── alembic/                    # Database migration versions
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
│   │   │   ├── gcp_secret_service.py    # Google Cloud Secret Manager client
│   │   │   ├── pinecone_service.py      # Pinecone dense vector similarity search
│   │   │   ├── postgres_service.py      # PostgreSQL database operations
│   │   │   └── hybrid_search_service.py # RRF fusion & OpenAI generation
│   │   └── main.py                 # FastAPI application factory and lifespan
│   ├── scripts/
│   │   ├── gcp_secrets_sync.py     # CLI sync to GCP Secret Manager
│   │   ├── init_services.py        # DB schema and index setup script
│   │   └── seed_data.py            # Sample RFP data seed script
│   └── requirements.txt
├── frontend/                       # React seller workspace
└── extension/                      # Manifest V3 browser extension
```
