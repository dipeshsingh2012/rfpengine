# 1. Artifact Registry Docker Repository
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Docker repository for RFPEngine backend images"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled_apis]
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
        name  = "PORT"
        value = "8000"
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }

      env {
        name  = "ELASTICSEARCH_URL"
        value = var.elasticsearch_url
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
        for_each = var.openai_api_key != "" ? [1] : []
        content {
          name = "OPENAI_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.openai_api_key.secret_id
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
    google_secret_manager_secret_iam_member.openai_key_access,
    google_secret_manager_secret_iam_member.pinecone_key_access,
  ]
}

# 3. Allow Public Unauthenticated Invocations for the API
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

