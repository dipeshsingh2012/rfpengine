output "cloud_run_url" {
  description = "The public HTTPS URL of the RFPEngine backend on Cloud Run"
  value       = google_cloud_run_v2_service.backend.uri
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository endpoint"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "service_account_email" {
  description = "Service account email used by Cloud Run"
  value       = google_service_account.cloud_run_sa.email
}
