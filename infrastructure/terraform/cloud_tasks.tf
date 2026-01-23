resource "google_cloud_tasks_queue" "podcast_translation" {
  name     = "podcast-translation-queue"
  location = var.region
  project  = var.project_id

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 5
    max_burst_size            = 10
  }

  retry_config {
    max_attempts       = 3
    max_retry_duration = "7200s"
    min_backoff        = "60s"
    max_backoff        = "600s"
    max_doublings      = 3
  }

  stackdriver_logging_config {
    sampling_ratio = 1.0
  }
}

resource "google_cloud_tasks_queue_iam_member" "backend_enqueue" {
  name   = google_cloud_tasks_queue.podcast_translation.name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${var.backend_service_account}"
}
