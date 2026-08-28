# ADR 0006: Centralized Secrets Management with GCP Secret Manager and Terraform

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

RFPEngine requires multiple sensitive credentials across its hybrid data architecture:
- **PostgreSQL Database URL / Credentials** (Neon database connection).
- **Elasticsearch API Key / URL** (Managed Elastic Cloud deployment).
- **Pinecone API Key** (Dense vector index).

Google Cloud Vertex AI (Gemini 2.5 Flash and `text-embedding-004`) authenticates natively using the Cloud Run Service Account (`roles/aiplatform.user`) and local Application Default Credentials (`gcp-key.json`), requiring no 3rd-party API tokens.

While third-party solutions like HashiCorp Cloud Platform Vault impose significant monthly costs (\$300–\$500+/mo), Google Cloud Secret Manager provides:
1. Generous **permanent free tier** (6 active secret versions and 10,000 access operations/month free).
2. Native, zero-latency integration with **Google Cloud Run** (secrets mounted directly into container environment variables at boot with IAM role-based authentication).
3. First-class **Terraform Infrastructure-as-Code** provisioning.

## Decision

We adopt **GCP Secret Manager** as the primary cloud secrets store:

1. **Dual Access Architecture**:
   - **Production (Cloud Run)**: Cloud Run resolves secrets natively at container startup via Secret Manager references in [`terraform/cloud_run.tf`](file:///home/dipes/projects/RFQEngine/terraform/cloud_run.tf), requiring zero custom SDK calls or boot latency.
   - **Standalone / Local / VM**: [`GCPSecretService`](file:///home/dipes/projects/RFQEngine/backend/app/services/gcp_secret_service.py) uses the `google-cloud-secret-manager` Python SDK to retrieve or sync secrets when running outside Cloud Run.
2. **Terraform Provisioning**:
   - Complete Terraform module in [`terraform/`](file:///home/dipes/projects/RFQEngine/terraform/) managing:
     - Canonical Secret Manager secrets (`rfpengine-database-url`, `rfpengine-elasticsearch-api-key`, `rfpengine-pinecone-api-key`).
     - Dedicated least-privilege IAM service account (`rfpengine-backend-sa@rfpengine.iam.gserviceaccount.com`).
     - Secret accessor IAM role bindings (`roles/secretmanager.secretAccessor`).
     - Vertex AI User role bindings (`roles/aiplatform.user`).
     - Private Docker repository (`us-central1-docker.pkg.dev/rfpengine/rfpengine-repo`).
     - Cloud Run v2 API service (`https://rfpengine-api-fwwnzie4dq-uc.a.run.app`).
3. **Local Dev Fallback**:
   - The application automatically falls back to standard `.env` variables if GCP Secret Manager is disabled or unconfigured (`GCP_SECRET_MANAGER_ENABLED=false`).

## Consequences

### Positive
- Negligible/zero cost (\$0.00 / month within free tier).
- Native Cloud Run IAM security (`roles/secretmanager.secretAccessor`) without hardcoded tokens.
- Repeatable, automated deployment via Terraform (`npm run tf:plan` / `npm run tf:apply`).
- Live production endpoint active at `https://rfpengine-api-fwwnzie4dq-uc.a.run.app`.

### Negative / Trade-offs
- Cloud deployments are tied to Google Cloud Platform IAM and Secret Manager service.

