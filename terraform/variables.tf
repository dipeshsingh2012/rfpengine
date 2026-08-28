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

variable "container_image" {
  type        = string
  description = "Container image URL to deploy to Cloud Run"
  default     = "us-docker.pkg.dev/cloudrun/container/hello" # Placeholder until first build is pushed
}

# --- Sensitive Secrets (stored in GCP Secret Manager) ---

variable "database_url" {
  type        = string
  description = "PostgreSQL connection string (e.g. Neon connection URL)"
  sensitive   = true
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API Key for embeddings and answer drafting"
  sensitive   = true
  default     = ""
}

variable "pinecone_api_key" {
  type        = string
  description = "Pinecone API Key for dense vector similarity search"
  sensitive   = true
  default     = ""
}

variable "elasticsearch_url" {
  type        = string
  description = "Elasticsearch endpoint URL"
  default     = "http://localhost:9200"
}

variable "elasticsearch_api_key" {
  type        = string
  description = "Elasticsearch API Key for Elastic Cloud"
  sensitive   = true
  default     = ""
}

variable "cors_origins" {
  type        = string
  description = "Allowed CORS origins for the frontend and extension"
  default     = "http://localhost:5173,https://your-domain.com"
}

