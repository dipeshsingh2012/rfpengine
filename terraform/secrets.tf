# 1. DATABASE_URL Secret (Neon PostgreSQL 17)
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.app_name}-database-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url_val" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

# 2. ELASTICSEARCH_API_KEY Secret (Elastic Cloud)
resource "google_secret_manager_secret" "elasticsearch_api_key" {
  secret_id = "${var.app_name}-elasticsearch-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "elasticsearch_api_key_val" {
  count       = var.elasticsearch_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.elasticsearch_api_key.id
  secret_data = var.elasticsearch_api_key
}

# 3. PINECONE_API_KEY Secret (Pinecone Serverless)
resource "google_secret_manager_secret" "pinecone_api_key" {
  secret_id = "${var.app_name}-pinecone-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "pinecone_api_key_val" {
  count       = var.pinecone_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.pinecone_api_key.id
  secret_data = var.pinecone_api_key
}
