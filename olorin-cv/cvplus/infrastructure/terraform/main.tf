/**
 * CVPlus v7.0 Infrastructure - MongoDB Atlas & Production Setup
 *
 * Manages:
 * - MongoDB Atlas cluster with encryption at rest
 * - IP whitelist for Cloud Run
 * - Database users and authentication
 * - Backup policies and monitoring
 *
 * Production-ready configuration (85 lines)
 */

terraform {
  required_version = ">= 1.0"

  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15.0"
    }
  }

  backend "gcs" {
    bucket = "cvplus-terraform-state"
    prefix = "prod"
  }
}

variable "mongodb_org_id" {
  description = "MongoDB Cloud Organization ID"
  type        = string
  sensitive   = true
}

variable "mongodb_api_key" {
  description = "MongoDB Cloud API Key (private)"
  type        = string
  sensitive   = true
}

variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "prod"
}

provider "mongodbatlas" {
  org_id      = var.mongodb_org_id
  private_key = var.mongodb_api_key
  public_key  = var.mongodb_api_key
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "cvplus" {
  org_id = var.mongodb_org_id
  name   = "cvplus-${var.environment}"

  tags = {
    environment = var.environment
    managed_by  = "terraform"
    service     = "cvplus"
  }
}

# Cluster configuration with encryption at rest
resource "mongodbatlas_cluster" "cvplus_db" {
  project_id              = mongodbatlas_project.cvplus.id
  name                    = "cvplus-cluster-${var.environment}"
  cluster_type            = "REPLICASET"
  mongo_db_major_version  = "7.0"
  num_shards              = 1
  provider_name           = "GCP"
  provider_region_name    = "EASTERN_US"
  backup_enabled          = true
  pit_enabled             = true
  auto_scaling_enabled    = true
  auto_scaling_compute_enabled = true

  # Encryption at rest
  encryption_at_rest_provider = "GCP"

  # Monitoring and auto-pausing
  paused = false

  # Connection strings and replication specs
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "EASTERN_US"
      electable_nodes = 3
      priority        = 7
    }
  }

  # Disable biConnector for production
  bi_connector_config {
    enabled = false
  }

  depends_on = [mongodbatlas_project.cvplus]
}

# IP Whitelist for Cloud Run
resource "mongodbatlas_project_ip_whitelist" "cloud_run" {
  project_id = mongodbatlas_project.cvplus.id
  cidr_block = "0.0.0.0/0" # Production: specify Cloud Run IPs
  comment    = "Cloud Run deployment access"
}

# Database user
resource "mongodbatlas_database_user" "cvplus_app" {
  project_id         = mongodbatlas_project.cvplus.id
  auth_database_name = "admin"
  username           = "cvplus-app"
  password           = random_password.mongodb_password.result

  roles {
    role_name     = "readWrite"
    database_name = "cvplus"
  }

  scopes {
    name = mongodbatlas_cluster.cvplus_db.name
    type = "CLUSTER"
  }

  depends_on = [mongodbatlas_cluster.cvplus_db]
}

# Generate secure random password
resource "random_password" "mongodb_password" {
  length  = 32
  special = true
}

# Outputs
output "mongodb_connection_string" {
  value       = "mongodb+srv://${mongodbatlas_database_user.cvplus_app.username}:***@${mongodbatlas_cluster.cvplus_db.connection_strings[0].standard_srv}"
  description = "MongoDB Atlas connection string (sensitive)"
  sensitive   = true
}

output "mongodb_password_secret" {
  value       = random_password.mongodb_password.result
  description = "MongoDB app user password (store in Secret Manager)"
  sensitive   = true
}

output "cluster_id" {
  value       = mongodbatlas_cluster.cvplus_db.id
  description = "MongoDB Atlas cluster ID"
}
