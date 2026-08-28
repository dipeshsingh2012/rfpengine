# ADR 0006: Centralized Secrets Management with GCP Secret Manager and Terraform

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

RFPEngine requires multiple sensitive credentials:
- **PostgreSQL Database URL / Credentials** (Neon database connection).
- **OpenAI API Key** (Embeddings and LLM answer generation).
- **Pinecone API Key** (Dense vector index).

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
   - Complete Terraform module in [`terraform/`](file:///home/dipes/projects/RFQEngine/terraform/) managing API enablement, Secret Manager resources, Cloud Run service account, IAM bindings, and Artifact Registry.
3. **Local Dev Fallback**:
   - The application automatically falls back to standard `.env` variables if GCP Secret Manager is disabled or unconfigured (`GCP_SECRET_MANAGER_ENABLED=false`).

## Consequences

### Positive
- Negligible/zero cost (\$0.00 / month within free tier).
- Native Cloud Run IAM security (`roles/secretmanager.secretAccessor`) without hardcoded tokens.
- Repeatable, automated deployment via Terraform.
- No unsealing, token rotation, or storage cluster management required.

### Negative / Trade-offs
- Cloud deployments are tied to Google Cloud Platform IAM and Secret Manager service.
