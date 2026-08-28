# ADR 0008: Native Google Cloud Vertex AI (Gemini 2.5 Flash and text-embedding-004) for Enterprise Inference

## Status
Accepted

## Context
RFPEngine requires:
1. **Vector Embedding Generation**: High-throughput semantic vectorization of 300–500 token document chunks during knowledge base ingestion and runtime questionnaire search queries.
2. **Grounded Answer Synthesis**: Zero-shot technical drafting of concise, professional questionnaire responses adhering strictly to retrieved citation sources.

Initially, external OpenAI APIs (`text-embedding-3-small` and `gpt-4o`) were proposed. However, relying solely on third-party API keys introduces external billing overhead, API key rotation complexity, and egress across cloud provider boundaries. Since RFPEngine is natively deployed on **Google Cloud Platform** (Cloud Run, Secret Manager, Artifact Registry), we evaluated **Google Cloud Vertex AI** to achieve zero-API-key IAM authentication and unified cloud billing.

## Decision
We adopt **Google Cloud Vertex AI** as the primary native LLM and vector embedding provider:
- **Primary Answering Model**: `gemini-2.5-flash` via the official `google-genai` Vertex AI SDK.
- **Primary Embedding Model**: `text-embedding-004` (768-dimensional dense vector embeddings with cosine similarity metric).
- **Zero Third-Party API Key Authentication**: Native GCP IAM authentication via Service Account credentials (`gcp-key.json` locally and `roles/aiplatform.user` on Cloud Run).
- **Pluggable Provider Architecture**: The backend retains support for OpenAI (`OPENAI_API_KEY`) as an optional secondary provider via configuration flags (`LLM_PROVIDER=vertexai`).

---

## Technical Specifications

### 1. Vector Embeddings (`text-embedding-004`)
- **Dimensionality**: `768` (optimized for accuracy and reduced Pinecone memory consumption).
- **Metric**: Cosine Similarity.
- **Batched Ingestion**: Multi-chunk batching via `genai.Client(vertexai=True).models.embed_content(model="text-embedding-004", contents=texts)`.

### 2. RFP Answer Generation (`gemini-2.5-flash`)
- **Latency & Cost**: Sub-second response times with enterprise-grade reasoning.
- **Strict Grounding**: System prompting strictly confines answers to approved knowledge base citations, returning explicit fallback notices when information is missing.

### 3. Infrastructure & IAM Management (Terraform)
- **IAM Binding**: `roles/aiplatform.user` granted to the Cloud Run Service Account (`rfpengine-backend-sa@rfpengine.iam.gserviceaccount.com`).
- **Cloud Run Environment**: Injected `LLM_PROVIDER=vertexai`, `GEMINI_MODEL=gemini-2.5-flash`, `VERTEX_EMBEDDING_MODEL=text-embedding-004`, and `EMBEDDING_DIMENSION=768`.

---

## Consequences

### Positive
- **Zero Third-Party API Keys**: Authenticates using the existing GCP project service account without external subscription keys.
- **Unified Enterprise Billing**: All model inference and embedding costs are billed directly to the GCP project (`rfpengine`).
- **Data Governance**: Prompts and enterprise documents remain strictly within Google Cloud's enterprise security boundary.
- **Faster Throughput**: High-rate limits on Vertex AI with zero latency penalty for cloud-hosted Cloud Run containers in `us-central1`.

### Negative / Trade-offs
- Local developer environments require a valid GCP Service Account JSON key (`gcp-key.json`) with `roles/aiplatform.user` (or fall back to deterministic unit vectors in offline mode).
- Pinecone index must be configured for 768 dimensions instead of 1,536 dimensions.
