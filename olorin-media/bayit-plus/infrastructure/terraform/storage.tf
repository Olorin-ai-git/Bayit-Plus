resource "google_storage_bucket" "podcast_translations" {
  name          = "${var.project_id}-podcast-translations"
  location      = "US"
  project       = var.project_id
  storage_class = "STANDARD"

  cors {
    origin          = ["https://bayitplus.com", "https://*.bayitplus.com"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Range"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  versioning {
    enabled = false
  }

  uniform_bucket_level_access {
    enabled = true
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.podcast_translations.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "podcast_cdn" {
  name        = "podcast-translations-cdn"
  bucket_name = google_storage_bucket.podcast_translations.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 86400
    max_ttl           = 604800
    negative_caching  = true
    serve_while_stale = 86400

    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }
  }
}

resource "google_compute_url_map" "podcast_cdn" {
  name            = "podcast-translations-cdn-url-map"
  default_service = google_compute_backend_bucket.podcast_cdn.id
}

resource "google_compute_target_https_proxy" "podcast_cdn" {
  name             = "podcast-translations-cdn-https-proxy"
  url_map          = google_compute_url_map.podcast_cdn.id
  ssl_certificates = [google_compute_managed_ssl_certificate.podcast_cdn.id]
}

resource "google_compute_managed_ssl_certificate" "podcast_cdn" {
  name = "podcast-translations-cdn-cert"

  managed {
    domains = ["podcasts-cdn.bayitplus.com"]
  }
}

resource "google_compute_global_forwarding_rule" "podcast_cdn" {
  name       = "podcast-translations-cdn-forwarding-rule"
  target     = google_compute_target_https_proxy.podcast_cdn.id
  port_range = "443"
  ip_address = google_compute_global_address.podcast_cdn.address
}

resource "google_compute_global_address" "podcast_cdn" {
  name = "podcast-translations-cdn-ip"
}
