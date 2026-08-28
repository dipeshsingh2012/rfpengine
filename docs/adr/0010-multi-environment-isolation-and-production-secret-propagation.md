# ADR 0010: Multi-Environment Isolation and Production Secret Propagation

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

As RFPEngine transitioned from a single local development environment to an enterprise multi-cloud deployment (Google Cloud Run, Vertex AI, Elastic Cloud, Neon PostgreSQL, Pinecone Serverless), several environment segregation and secret propagation challenges arose:

1. **Vector Index Pollution**: Local automated test runs, exploratory queries, and document uploads shared the same Pinecone index as production, risking data corruption or false search results in production.
2. **Configuration & Secrets Propagation**: Managing sensitive API credentials (database connection strings, Elastic Cloud API keys, Pinecone API keys) requires strict separation between local developer `.env` files and production runtime environments without leaking credentials into version control or Docker image layers.
3. **Frontend API URL Ambiguity**: Frontend single-page applications running across local dev servers (`http://localhost:5173`) and production domains (`https://www.rfpengine.net`) must target the appropriate backend endpoints without hardcoded URLs or broken relative proxy paths.

## Decision

We implement a comprehensive **Multi-Environment Isolation and Secret Propagation Architecture**:

### 1. Vector Database Namespace Partitioning
- **Pinecone Serverless**: Partitioned using environment namespaces (`local` vs `prod`).
- All vector upserts, deletes, and semantic queries automatically scope their operations to `namespace = settings.effective_pinecone_namespace`.
- Local test suites and developer runs execute in the `local` namespace, isolating production vectors (`prod` namespace).

### 2. Secret Management & Secure Container Injection
- **Zero-Secret Docker Images**: `.env` and `.env.local` files are strictly excluded from Docker images via `.dockerignore` and `.gitignore`.
- **GCP Secret Manager as Single Source of Truth for Prod**:
  - `rfpengine-database-url`: Encrypted Neon PostgreSQL connection string.
  - `rfpengine-elasticsearch-api-key`: Elastic Cloud 9.5.2 API key.
  - `rfpengine-pinecone-api-key`: Pinecone Serverless API key.
- **Native Boot-Time Secret Injection**:
  - In Terraform (`terraform/cloud_run.tf`), Cloud Run mounts secrets directly into process memory at container startup via `secret_key_ref`, eliminating the need for application-level secret fetching during request handling:
    ```hcl
    env {
      name = "DATABASE_URL"
      value_source {
        secret_key_ref {
          secret  = google_secret_manager_secret.database_url.secret_id
          version = "latest"
        }
      }
    }
    ```
- **Automated Synchronization Tooling**:
  - `npm run secrets:sync`: Syncs and audits local `.env` keys into GCP Secret Manager with automated versioning.

### 3. Frontend Multi-Environment Resolution & Live Switching
- **Environment Profiles**:
  - `frontend/.env.development`: Targets local dev proxy (`/api` $\rightarrow$ `http://localhost:8000`).
  - `frontend/.env.production`: Targets the canonical regional Cloud Run URL (`https://rfpengine-api-714049712844.us-central1.run.app/api`).
- **Dynamic URL Normalization**:
  - Added `getApiBaseUrl()` in `frontend/src/App.tsx` to handle relative paths, trailing slashes, and explicit hostnames seamlessly.
- **Live Environment Switcher & Health Indicator**:
  - Visual status pill in the top header showing connected backend target (`🟡 LOCAL DEV` vs `🟢 PROD CLOUD`) and real-time service health status (`ok` / `degraded`).
  - Allows one-click switching between local development and cloud production APIs.

### 4. Cross-Origin Resource Sharing (CORS) Governance
- Cloud Run container configuration accepts origin lists for:
  - Local Vite dev server: `http://localhost:5173`, `http://localhost:3000`
  - Production web domains: `https://www.rfpengine.net`, `https://rfpengine.net`
  - Chrome Extension regex: `chrome-extension://.*`

## Consequences

### Positive
- **Complete Vector Data Isolation**: Local testing and document uploads never corrupt production search indices.
- **Secure Secret Propagation**: Production credentials never touch disk or git; they are managed in GCP Secret Manager and mounted into Cloud Run container memory.
- **Deterministic Multi-Environment Builds**: `npm run build:frontend` produces production-ready bundles referencing the canonical Cloud Run API.
- **Instant Observability**: The `/api/health` endpoint reports the active environment (`environment: "local" | "prod"`) and status across all 5 infrastructure dependencies.

### Negative / Trade-offs
- Changing production secrets requires updating Secret Manager versions (handled via `npm run secrets:sync` or Terraform).

