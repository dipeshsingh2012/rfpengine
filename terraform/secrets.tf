# 1. DATABASE_URL Secret
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.app_name}-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret_version" "database_url_val" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

# 2. OPENAI_API_KEY Secret
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "${var.app_name}-openai-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret_version" "openai_api_key_val" {
  count       = var.openai_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

# 3. PINECONE_API_KEY Secret
resource "google_secret_manager_secret" "pinecone_api_key" {
  secret_id = "${var.app_name}-pinecone-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret_version" "pinecone_api_key_val" {
  count       = var.pinecone_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.pinecone_api_key.id
  secret_data = var.pinecone_api_key
}
