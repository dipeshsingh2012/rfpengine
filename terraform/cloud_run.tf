# 1. Artifact Registry Docker Repository
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Docker repository for RFPEngine backend images"
  format        = "DOCKER"
}

# 2. Cloud Run Service (v2)
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.app_name}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = 0 # Scale to zero when idle ($0 idle cost)
      max_instance_count = 10
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }

      env {
        name  = "ELASTICSEARCH_URL"
        value = var.elasticsearch_url
      }

      env {
        name  = "ELASTICSEARCH_INDEX"
        value = var.elasticsearch_index
      }

      env {
        name  = "PINECONE_INDEX"
        value = var.pinecone_index
      }

      env {
        name  = "PINECONE_CLOUD"
        value = var.pinecone_cloud
      }

      env {
        name  = "PINECONE_REGION"
        value = var.pinecone_region
      }

      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }

      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }

      env {
        name  = "VERTEX_EMBEDDING_MODEL"
        value = var.vertex_embedding_model
      }

      env {
        name  = "EMBEDDING_DIMENSION"
        value = tostring(var.embedding_dimension)
      }

      # Direct Secret Manager Injection at Container Boot
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.elasticsearch_api_key != "" ? [1] : []
        content {
          name = "ELASTICSEARCH_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.elasticsearch_api_key.secret_id
              version = "latest"
            }
          }
        }
      }

      dynamic "env" {
        for_each = var.pinecone_api_key != "" ? [1] : []
        content {
          name = "PINECONE_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.pinecone_api_key.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.db_url_access,
    google_secret_manager_secret_iam_member.elasticsearch_key_access,
    google_secret_manager_secret_iam_member.pinecone_key_access,
  ]
}

# 3. Allow Public Unauthenticated Ingress to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
