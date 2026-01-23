# Terraform Variables for Podcast Translation Infrastructure

variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region for resources"
  type        = string
  default     = "us-central1"
}

variable "image_tag" {
  description = "Docker image tag for translation worker"
  type        = string
  default     = "latest"
}

variable "devops_email" {
  description = "Email address for DevOps notifications"
  type        = string
}

variable "backend_service_account" {
  description = "Service account email for backend API (with Cloud Tasks enqueue permissions)"
  type        = string
}

# Optional variables with defaults

variable "translation_job_cpu" {
  description = "CPU allocation for translation job"
  type        = string
  default     = "4"
}

variable "translation_job_memory" {
  description = "Memory allocation for translation job"
  type        = string
  default     = "8Gi"
}

variable "translation_job_timeout" {
  description = "Timeout for translation job in seconds"
  type        = string
  default     = "3600s"
}

variable "max_concurrent_translations" {
  description = "Maximum number of concurrent translation jobs"
  type        = number
  default     = 5
}

variable "cdn_domain" {
  description = "Custom domain for CDN"
  type        = string
  default     = "podcasts-cdn.bayitplus.com"
}

variable "bucket_location" {
  description = "Location for GCS bucket"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Storage class for GCS bucket"
  type        = string
  default     = "STANDARD"
}
