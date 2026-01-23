resource "google_cloud_run_v2_job" "podcast_translation" {
  name     = "podcast-translation-job"
  location = var.region
  project  = var.project_id

  template {
    template {
      containers {
        image = "gcr.io/${var.project_id}/podcast-translation-worker:${var.image_tag}"

        resources {
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }

        env {
          name  = "PODCAST_TRANSLATION_ENABLED"
          value = "true"
        }

        env {
          name  = "PODCAST_TRANSLATION_MAX_CONCURRENT"
          value = "2"
        }

        env {
          name = "MONGODB_URI"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.mongodb_uri.secret_id
              version = "latest"
            }
          }
        }

        env {
          name = "ELEVENLABS_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.elevenlabs_api_key.secret_id
              version = "latest"
            }
          }
        }

        env {
          name  = "GCS_BUCKET_NAME"
          value = google_storage_bucket.podcast_translations.name
        }

        env {
          name  = "TEMP_AUDIO_DIR"
          value = "/workspace/temp"
        }

        volume_mounts {
          name       = "temp-audio"
          mount_path = "/workspace/temp"
        }
      }

      volumes {
        name = "temp-audio"
        empty_dir {
          medium     = "Memory"
          size_limit = "4Gi"
        }
      }

      timeout = "3600s"

      service_account = google_service_account.podcast_translation_worker.email

      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"

      max_retries = 3
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image
    ]
  }
}

resource "google_service_account" "podcast_translation_worker" {
  account_id   = "podcast-translation-worker"
  display_name = "Podcast Translation Worker"
  project      = var.project_id
}

resource "google_project_iam_member" "translation_worker_gcs" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.podcast_translation_worker.email}"
}

resource "google_project_iam_member" "translation_worker_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.podcast_translation_worker.email}"
}

resource "google_project_iam_member" "translation_worker_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.podcast_translation_worker.email}"
}

resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "mongodb-uri"
  project   = var.project_id

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret" "elevenlabs_api_key" {
  secret_id = "elevenlabs-api-key"
  project   = var.project_id

  replication {
    automatic = true
  }
}
