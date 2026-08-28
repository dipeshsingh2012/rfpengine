terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = var.credentials_file != "" ? file(var.credentials_file) : null
}

# 1. Required GCP APIs (enable manually or via GCP Console if service account lacks Service Usage Admin)
# resource "google_project_service" "enabled_apis" {
#   for_each = toset([
#     "run.googleapis.com",
#     "secretmanager.googleapis.com",
#     "artifactregistry.googleapis.com",
#     "iam.googleapis.com",
#   ])
#   service            = each.key
#   disable_on_destroy = false
# }

