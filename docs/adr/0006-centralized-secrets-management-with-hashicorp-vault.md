# ADR 0006: Centralized Secrets Management with HashiCorp Vault

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

RFPEngine interacts with multiple external platforms and datastores requiring sensitive credentials:
- **OpenAI API Key**: Used for text embeddings and answer generation.
- **PostgreSQL Database URL / Credentials**: Primary persistent store for canonical records and review tracking.
- **Pinecone API Key**: Dense vector search index.
- **Elasticsearch Credentials**: Sparse BM25 search cluster.

Storing credentials solely in local `.env` files presents challenges for team collaboration, production staging, key rotation, and secret sprawl in cloud environments.

## Decision

We integrate **HashiCorp Vault** (KV v2 Secrets Engine) for secure, centralized secrets management:

1. **Vault Client & Service Layer**:
   - Implemented [`VaultService`](file:///home/dipes/projects/RFQEngine/backend/app/services/vault_service.py) using the official `hvac` Python SDK.
   - Configured secret path resolution (default: `secret/data/rfpengine`).
2. **Dynamic Boot Ingestion with Fallback**:
   - When `VAULT_ENABLED=true`, the application automatically fetches secrets from Vault at startup and injects them into application settings via `apply_vault_secrets()`.
   - If Vault is unconfigured or disabled, the application seamlessly falls back to standard `.env` environment variables.
3. **Local Dev Container & CLI Sync**:
   - Added a Vault service in [`docker-compose.yml`](file:///home/dipes/projects/RFQEngine/docker-compose.yml) (port `8200`, root token `root`).
   - Created [`vault_sync.py`](file:///home/dipes/projects/RFQEngine/backend/scripts/vault_sync.py) to push and verify local environment secrets into Vault's KV engine.
4. **Health Diagnostics**:
   - Integrated Vault seal, initialization, and latency status into `GET /health`.

## Consequences

### Positive
- Enterprise-grade secret security, audit logging, and centralized rotation capabilities.
- Prevents accidental credential leaks in source code and logs.
- Zero breaking changes to local development workflows due to the automatic `.env` fallback.

### Negative / Trade-offs
- Additional infrastructure service when running with Vault in staging/production environments.
