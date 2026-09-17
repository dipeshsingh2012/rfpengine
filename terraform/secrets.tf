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

# 2. ALGOLIA_APP_ID Secret (Algolia Cloud)
resource "google_secret_manager_secret" "algolia_app_id" {
  secret_id = "${var.app_name}-algolia-app-id"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "algolia_app_id_val" {
  count       = var.algolia_app_id != "" ? 1 : 0
  secret      = google_secret_manager_secret.algolia_app_id.id
  secret_data = var.algolia_app_id
}

# 3. ALGOLIA_API_KEY Secret (Algolia Cloud)
resource "google_secret_manager_secret" "algolia_api_key" {
  secret_id = "${var.app_name}-algolia-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "algolia_api_key_val" {
  count       = var.algolia_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.algolia_api_key.id
  secret_data = var.algolia_api_key
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
