variable "project_id" {
  type        = string
  description = "The Google Cloud Platform project ID"
}

variable "credentials_file" {
  type        = string
  description = "Path to GCP service account key JSON file (optional, defaults to Application Default Credentials)"
  default     = ""
}

variable "region" {
  type        = string
  description = "GCP Region to deploy resources (e.g. us-central1, us-east1)"
  default     = "us-central1"
}

variable "app_name" {
  type        = string
  description = "Application name prefix for GCP resources"
  default     = "rfpengine"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. prod, staging, dev)"
  default     = "prod"
}

variable "container_image" {
  type        = string
  description = "Container image URL to deploy to Cloud Run"
  default     = "us-central1-docker.pkg.dev/rfpengine/rfpengine-repo/rfpengine-api:v0.2.0"
}

# --- Sensitive Secrets (stored in GCP Secret Manager) ---

variable "database_url" {
  type        = string
  description = "PostgreSQL connection string (Neon Cloud)"
  sensitive   = true
}

variable "elasticsearch_api_key" {
  type        = string
  description = "Elasticsearch API Key for Elastic Cloud"
  sensitive   = true
  default     = ""
}

variable "pinecone_api_key" {
  type        = string
  description = "Pinecone API Key for dense vector similarity search"
  sensitive   = true
  default     = ""
}

# --- Search & Infrastructure Settings ---

variable "elasticsearch_url" {
  type        = string
  description = "Elasticsearch endpoint URL (Elastic Cloud)"
  default     = "https://ba084bb1a22b44618a61af41fbedc84b.us-central1.gcp.cloud.es.io:443"
}

variable "elasticsearch_index" {
  type        = string
  description = "Elasticsearch index name"
  default     = "rfp_knowledge_base"
}

variable "pinecone_index" {
  type        = string
  description = "Pinecone vector index name"
  default     = "rfp-knowledge-base"
}

variable "pinecone_cloud" {
  type        = string
  description = "Pinecone serverless cloud provider (e.g. aws, gcp)"
  default     = "aws"
}

variable "pinecone_region" {
  type        = string
  description = "Pinecone serverless cloud region"
  default     = "us-east-1"
}

variable "cors_origins" {
  type        = string
  description = "Allowed CORS origins for the frontend and extension"
  default     = "http://localhost:5173,http://localhost:3000"
}

variable "llm_provider" {
  type        = string
  description = "Primary LLM and Embedding provider (vertexai)"
  default     = "vertexai"
}

variable "gemini_model" {
  type        = string
  description = "Google Cloud Vertex AI Gemini model name"
  default     = "gemini-2.5-flash"
}

variable "vertex_embedding_model" {
  type        = string
  description = "Google Cloud Vertex AI embedding model"
  default     = "text-embedding-004"
}

variable "embedding_dimension" {
  type        = number
  description = "Vector embedding dimensionality (768 for Vertex AI text-embedding-004)"
  default     = 768
}
