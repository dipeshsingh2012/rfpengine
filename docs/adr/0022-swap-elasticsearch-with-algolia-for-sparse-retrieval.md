# 22. Swap Elasticsearch with Algolia for Sparse Retrieval & Text Store

* Status: Accepted
* Date: 2026-09-17
* Deciders: RFPEngine Core Architecture Team

## Context and Problem Statement

RFPEngine utilizes a hybrid retrieval architecture combining sparse keyword retrieval and dense vector similarity search merged via Reciprocal Rank Fusion (RRF). Previously, **Elasticsearch** (via Elastic Cloud and local containers) served as the sparse BM25 retriever and document chunk text store.

However, running and maintaining Elasticsearch cluster nodes or Elastic Cloud deployments introduces operational overhead, cluster management complexity, higher memory footprint, and cold-start latency. We sought a fully cloud-managed, high-performance sparse search service with zero infrastructure maintenance, fast indexing, fast response times, and built-in faceting.

## Decision Drivers

* **Zero Infrastructure Overhead**: Algolia is a fully managed cloud service requiring no local clusters or shard management.
* **Low Latency & High Performance**: Algolia's global search network delivers sub-50ms search latency for keyword queries.
* **Unified API & Simple Administration**: Cloud Secret Manager integration and simple API key-based authentication (`ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`).
* **Multi-Tenant Isolation**: Algolia supports facet filtering (`filterOnly(tenant_id)`), allowing strict per-tenant scope isolation.

## Considered Options

1. **Keep Elasticsearch / Elastic Cloud**: High operational complexity, Java memory requirements for local execution.
2. **PostgreSQL Full-Text Search (tsvector)**: Integrated with DB, but lacks advanced relevance ranking and fast standalone search scaling.
3. **Migrate to Algolia**: Fully managed SaaS, fast keyword search, easy integration with Reciprocal Rank Fusion.

## Decision Outcome

Chosen Option: **Option 3 (Migrate to Algolia)**.

### Architectural Changes

1. **Service Layer**: Introduced `AlgoliaService` (`app/services/algolia_service.py`) replacing legacy `ElasticsearchService`.
2. **Hybrid Search Integration**: Updated `HybridSearchService` (`app/services/hybrid_search_service.py`) to execute sparse search against Algolia and fuse results with Pinecone dense vector search hits.
3. **Secret & Infra Configuration**:
   - Environment variables: `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX_NAME`.
   - Provisioned secrets via Terraform (`google_secret_manager_secret.algolia_app_id` and `google_secret_manager_secret.algolia_api_key`) to inject directly into Cloud Run at boot.
   - Removed local Elasticsearch container from `docker-compose.yml`.
4. **API & Diagnostics**: Updated `/health` endpoint and connection diagnostics CLI to check Algolia API health and index status.

## Consequences

* **Positive**:
  - Eliminated local Elasticsearch container requirement and reduced memory requirements.
  - Simplified production deployment with Google Cloud Secret Manager + Algolia Cloud.
  - Retained full hybrid search capability with SME Golden Q&A Reciprocal Rank Fusion.
* **Negative**:
  - Requires Algolia Cloud API credentials (`ALGOLIA_APP_ID` and `ALGOLIA_API_KEY`).

