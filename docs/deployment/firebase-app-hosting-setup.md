# Firebase App Hosting Deployment Setup

**Author:** Gil Klainert  
**Date:** 2025-08-31  
**Project:** Olorin Fraud Detection Platform  
**Environment:** Production (prd)  

## Overview

This document describes the Firebase App Hosting configuration for the Olorin Python FastAPI backend with complete MCP (Model Context Protocol) integration and 200+ fraud investigation tools.

## Architecture

### Deployment Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI with Uvicorn
- **Container:** Docker with multi-stage build
- **Hosting:** Firebase App Hosting + Cloud Run
- **Environment:** Production (prd)
- **Project ID:** olorin-ai
- **Location:** us-central1

### Resource Allocation
- **CPU:** 2 vCPU cores
- **Memory:** 4GB RAM
- **Scaling:** 1-100 instances
- **Port:** 8000 (FastAPI)

## Configuration Files

### 1. apphosting.yaml
Primary Firebase App Hosting configuration with:
- **Runtime Configuration:** Python 3.11, resource limits, scaling
- **Environment Variables:** All non-sensitive configuration
- **Secret Mapping:** Firebase Secret Manager integration
- **Health Checks:** Startup and liveness probes
- **Build Configuration:** Docker build from olorin-server/

### 2. firebase.json
Extended Firebase configuration supporting both:
- **App Hosting:** Backend service configuration
- **Static Hosting:** Frontend deployment (existing)

### 3. .env.yaml
Production environment variables for:
- **Application Configuration:** Ports, logging, CORS
- **Database/Redis Configuration:** Connection settings
- **Feature Flags:** MCP integration, autonomous investigation
- **Performance Tuning:** Workers, connections, timeouts
- **Security Settings:** JWT, encryption, audit logging

### 4. cloudbuild.yaml
Complete CI/CD pipeline with:
- **Quality Checks:** Black, isort, MyPy, security scanning
- **Testing:** Unit tests with coverage
- **Security:** Safety, Bandit vulnerability scans
- **Build:** Docker image creation and registry push
- **Deployment:** Automated App Hosting deployment

### 5. deploy-backend.sh
Production deployment script with:
- **Prerequisites Validation:** CLI tools, authentication
- **Configuration Checks:** File validation, project access
- **Deployment Orchestration:** Firebase App Hosting deployment
- **Health Monitoring:** Post-deployment verification

## Secret Management

### Firebase Secret Manager Integration

All sensitive configuration is managed through Firebase Secret Manager with the following mapping:

| Environment Variable | Secret Path | Description |
|---------------------|-------------|-------------|
| `ANTHROPIC_API_KEY` | `prd/olorin/anthropic_api_key` | Claude API access for LLM agents |
| `OPENAI_API_KEY` | `prd/olorin/openai_api_key` | OpenAI API for GPT models |
| `DB_PASSWORD` | `prd/olorin/database_password` | Production database password |
| `REDIS_PASSWORD` | `prd/olorin/redis_password` | Redis cache password |
| `JWT_SECRET_KEY` | `prd/olorin/jwt_secret_key` | JWT token signing key |
| `SPLUNK_USERNAME` | `prd/olorin/splunk_username` | Splunk integration username |
| `SPLUNK_PASSWORD` | `prd/olorin/splunk_password` | Splunk integration password |
| `GAIA_API_KEY` | `prd/olorin/gaia_api_key` | GAIA service API key |
| `OLORIN_API_KEY` | `prd/olorin/olorin_api_key` | Internal API authentication |

### Additional API Keys for Fraud Investigation Tools

| Environment Variable | Secret Path | Description |
|---------------------|-------------|-------------|
| `ABUSEIPDB_API_KEY` | `prd/olorin/abuseipdb_api_key` | IP reputation checking |

## MCP Integration Features

### Complete Tool Integration
- **200+ Fraud Investigation Tools:** Device analysis, network monitoring, behavioral patterns
- **LangGraph Agents:** Multi-agent system for autonomous investigations
- **Real-time Processing:** WebSocket integration for live updates
- **Advanced Analytics:** Pattern recognition and risk scoring

### MCP Server Configuration
- **Host:** 0.0.0.0 (all interfaces)
- **Port:** 8001 (separate from FastAPI)
- **Workers:** 4 concurrent workers
- **Timeout:** 300 seconds for complex investigations

## Deployment Process

### Prerequisites

1. **Firebase CLI** with authentication:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Google Cloud CLI** (optional but recommended):
   ```bash
   gcloud auth login
   gcloud config set project olorin-ai
   ```

3. **Project Access:** Ensure user has App Hosting permissions

### Manual Deployment

```bash
# From project root directory
./deploy-backend.sh

# Dry run validation
./deploy-backend.sh --dry-run

# Verbose output
./deploy-backend.sh --verbose
```

### CI/CD Deployment

Cloud Build automatically triggers on:
- **Push to main branch**
- **Manual trigger via Cloud Console**
- **API trigger for automation**

```bash
# Trigger manual build
gcloud builds submit --config cloudbuild.yaml
```

## Health Monitoring

### Health Check Endpoints
- **Path:** `/health`
- **Startup Probe:** 30s initial delay, 10s interval, 10 failure threshold
- **Liveness Probe:** 10s interval, 3 failure threshold, 30s timeout

### Monitoring Integration
- **Cloud Monitoring:** Automatic metrics collection
- **Structured Logging:** JSON format with correlation IDs
- **Error Tracking:** Integration with Cloud Error Reporting
- **Performance Monitoring:** Response times, throughput, error rates

## Security Configuration

### Network Security
- **CORS:** Configured for production domains only
- **TLS:** Automatic HTTPS with managed certificates
- **Ingress:** Allow all (public API with authentication)

### Application Security
- **JWT Authentication:** HS256 with 2-hour expiry
- **Rate Limiting:** 1000 requests/hour per client
- **Input Validation:** Pydantic models with strict validation
- **Security Headers:** Automatic security headers via Cloud Run

### Secrets Security
- **Secret Manager:** All sensitive data in Firebase Secret Manager
- **IAM Permissions:** Least-privilege access to secrets
- **Audit Logging:** All secret access logged
- **Rotation:** Automatic secret rotation capabilities

## Performance Optimization

### Scaling Configuration
- **Auto-scaling:** CPU-based (70% threshold) and concurrency-based (100 concurrent)
- **Min Instances:** 1 (always warm)
- **Max Instances:** 100 (high availability)
- **Session Affinity:** Enabled for MCP connections

### Resource Optimization
- **Memory:** 4GB for complex investigations
- **CPU:** 2 vCPU for parallel processing
- **Connection Pool:** Optimized for database and Redis
- **Cache Strategy:** Multi-level caching with TTL

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check Cloud Build logs in GCP Console
   - Verify all secrets exist in Secret Manager
   - Ensure Docker build succeeds locally

2. **Health Check Failures**
   - Verify `/health` endpoint responds
   - Check application startup logs
   - Validate database connectivity

3. **MCP Integration Issues**
   - Verify MCP server starts on port 8001
   - Check agent initialization logs
   - Validate API key configurations

4. **Performance Issues**
   - Monitor CPU/memory usage
   - Check database connection pool
   - Review scaling configuration

### Debug Commands

```bash
# Check deployment status
firebase apphosting:backends:list

# View Cloud Run service details
gcloud run services describe olorin-backend \
  --region=us-central1 --project=olorin-ai

# Check service logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=olorin-backend" \
  --project=olorin-ai --limit=100

# Test health endpoint
curl -X GET https://olorin-backend-[hash]-uc.a.run.app/health
```

## Post-Deployment Verification

### Verification Checklist
- [ ] Service responds to health check
- [ ] MCP server initializes successfully
- [ ] Database connections established
- [ ] Redis cache operational
- [ ] All API keys validated
- [ ] Agent system functional
- [ ] WebSocket connections working
- [ ] Scaling triggers respond correctly

### Performance Validation
- [ ] Response time < 200ms for health checks
- [ ] Investigation processing < 30s
- [ ] Memory usage stable under load
- [ ] No error spikes in monitoring
- [ ] Auto-scaling functions properly

## Rollback Procedure

### Emergency Rollback

```bash
# List recent deployments
gcloud run revisions list --service=olorin-backend \
  --region=us-central1 --project=olorin-ai

# Rollback to previous revision
gcloud run services update-traffic olorin-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1 --project=olorin-ai
```

### Configuration Rollback
- Revert configuration files to previous commit
- Redeploy using `deploy-backend.sh`
- Verify health checks pass

## Support and Escalation

### Internal Escalation
1. **Development Team:** Configuration and code issues
2. **DevOps Team:** Infrastructure and deployment issues
3. **Security Team:** Secret management and access issues

### External Support
1. **Firebase Support:** App Hosting specific issues
2. **Google Cloud Support:** Cloud Run and infrastructure
3. **Provider Support:** Third-party API integration issues

---

## Appendix

### Related Documentation
- [Olorin Architecture Overview](../architecture/system-overview.md)
- [MCP Integration Guide](../mcp/integration-guide.md)
- [Security Configuration](../security/production-security.md)
- [Monitoring Setup](../monitoring/production-monitoring.md)

### Configuration Files Location
```
/Users/gklainert/Documents/olorin/
├── apphosting.yaml          # Firebase App Hosting configuration
├── firebase.json            # Extended Firebase configuration
├── .env.yaml               # Production environment variables
├── cloudbuild.yaml         # CI/CD pipeline configuration
└── deploy-backend.sh       # Deployment automation script
```