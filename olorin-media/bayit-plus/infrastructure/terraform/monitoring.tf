resource "google_monitoring_alert_policy" "translation_job_failures" {
  display_name = "Podcast Translation Job Failures"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "High job failure rate"

    condition_threshold {
      filter          = <<-EOT
        resource.type="cloud_run_job"
        AND resource.labels.job_name="podcast-translation-job"
        AND metric.type="run.googleapis.com/job/completed_execution_count"
        AND metric.labels.result="failed"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }
}

resource "google_monitoring_alert_policy" "translation_job_duration" {
  display_name = "Podcast Translation Job Taking Too Long"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "Job duration exceeds 45 minutes"

    condition_threshold {
      filter          = <<-EOT
        resource.type="cloud_run_job"
        AND resource.labels.job_name="podcast-translation-job"
        AND metric.type="run.googleapis.com/job/execution_time"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2700

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "DevOps Email Notifications"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = var.devops_email
  }
}

resource "google_monitoring_dashboard" "podcast_translation" {
  dashboard_json = jsonencode({
    displayName = "Podcast Translation Pipeline"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Job Completion Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"podcast-translation-job\" AND metric.type=\"run.googleapis.com/job/completed_execution_count\""
                  }
                }
              }]
            }
          }
        },
        {
          width  = 6
          height = 4
          widget = {
            title = "Translation Queue Size"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_tasks_queue\" AND resource.labels.queue_id=\"podcast-translation-queue\" AND metric.type=\"cloudtasks.googleapis.com/queue/depth\""
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}
