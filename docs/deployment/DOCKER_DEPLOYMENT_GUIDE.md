# Olorin Docker Deployment Guide

Complete guide for packaging and deploying the Olorin fraud detection system using Docker containers for full offline capability.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Building Images](#building-images)
5. [Creating Offline Package](#creating-offline-package)
6. [Offline Deployment](#offline-deployment)
7. [Configuration](#configuration)
8. [Multi-Architecture Support](#multi-architecture-support)
9. [Production Deployment](#production-deployment)
10. [Backup and Migration](#backup-and-migration)
11. [Troubleshooting](#troubleshooting)

## Overview

The Olorin Docker deployment provides:

- **Complete containerization** of all system components
- **Full offline deployment** capability with image tarballs
- **Multi-architecture support** (AMD64/ARM64)
- **Production-ready configuration** with health checks
- **Automated packaging** and deployment scripts
- **Data persistence** with Docker volumes

### Architecture Components

- **olorin-backend**: Python FastAPI service with Poetry dependency management
- **olorin-frontend**: React TypeScript application served via Nginx
- **olorin-web-portal**: Marketing website with multi-language support
- **PostgreSQL 16**: Primary database with extensions
- **Redis 7**: Caching and session management
- **Nginx**: Reverse proxy (optional)

## Prerequisites

### Source Machine (for building)
- Docker Engine 20.10+ 
- Docker Compose 1.29+ or Docker Compose V2
- Docker Buildx (for multi-architecture builds)
- 4GB+ available disk space
- Internet connection (for dependency downloads)

### Target Machine (for deployment)
- Docker Engine 20.10+
- Docker Compose 1.29+ or Docker Compose V2  
- 4GB+ available disk space
- 4GB+ RAM recommended
- No internet connection required

## Quick Start

### 1. Build All Components
```bash
# Build all Docker images
./scripts/docker-build.sh

# Or build specific components
./scripts/docker-build.sh backend
./scripts/docker-build.sh frontend
```

### 2. Create Offline Package
```bash
# Create complete deployment package
./scripts/docker-package.sh

# Creates: olorin-deployment-latest-YYYYMMDD-HHMMSS.tar.gz
```

### 3. Deploy on Target Machine
```bash
# Extract package
tar -xzf olorin-deployment-latest-*.tar.gz
cd olorin-package

# Configure environment
cp .env.example .env
nano .env  # Edit configuration

# Deploy
./deploy.sh
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **Web Portal**: http://localhost:8080

## Building Images

### Basic Build
```bash
# Build all components with latest tag
./scripts/docker-build.sh

# Build specific component
./scripts/docker-build.sh backend
./scripts/docker-build.sh frontend
./scripts/docker-build.sh portal
```

### Advanced Build Options
```bash
# Custom tag
./scripts/docker-build.sh --tag v1.0.0

# Multi-architecture build
./scripts/docker-build.sh --platform linux/amd64,linux/arm64

# Build and push to registry
./scripts/docker-build.sh --registry myregistry.com/olorin --push

# Build without cache
./scripts/docker-build.sh --no-cache

# Single platform with local load
./scripts/docker-build.sh --platform linux/amd64 --load
```

### Manual Docker Commands
```bash
# Backend
docker build -t olorin-backend:latest ./olorin-server

# Frontend  
docker build -t olorin-frontend:latest ./olorin-front

# Web Portal
docker build -t olorin-portal:latest ./olorin-web-portal
```

## Creating Offline Package

### Full Package
```bash
# Create complete package with all components
./scripts/docker-package.sh

# Custom output directory and tag
./scripts/docker-package.sh --tag v1.0.0 --output /tmp/olorin-deploy
```

### Selective Packaging
```bash
# Package only images and config (minimal)
./scripts/docker-package.sh --no-docs --no-scripts

# Package without images (config only)
./scripts/docker-package.sh --no-images

# Package with custom options
./scripts/docker-package.sh \
    --tag production \
    --output ./production-package \
    --no-docs
```

### Package Contents
The generated package includes:

```
olorin-package/
├── images/                     # Docker image .tar files
│   ├── olorin-backend__latest.tar
│   ├── olorin-frontend__latest.tar
│   ├── olorin-portal__latest.tar
│   ├── postgres__16-alpine.tar
│   ├── redis__7-alpine.tar
│   └── manifest.txt
├── docker-compose.yml          # Service orchestration
├── .env.example               # Environment template
├── config/                    # Configuration files
│   └── nginx/
├── scripts/                   # Database and utility scripts
│   └── init-db.sql
├── docs/                      # Documentation
├── deploy.sh                  # Deployment script
├── uninstall.sh              # Removal script
├── README.md                  # Deployment guide
└── package-info.json         # Package metadata
```

## Offline Deployment

### On Target Machine

1. **Transfer Package**
   ```bash
   # Via USB, network, or other means
   scp olorin-deployment-*.tar.gz target-machine:~/
   ```

2. **Extract Package**
   ```bash
   tar -xzf olorin-deployment-*.tar.gz
   cd olorin-package
   ```

3. **Load Docker Images**
   ```bash
   # Automated via deploy script (recommended)
   ./deploy.sh
   
   # Or manual load
   find images -name "*.tar" -exec docker load -i {} \;
   ```

4. **Configure Environment**
   ```bash
   # Copy template and edit
   cp .env.example .env
   nano .env
   ```

5. **Start Services**
   ```bash
   docker compose up -d
   ```

### Deployment Verification
```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000/
```

## Configuration

### Environment Variables

Key settings in `.env` file:

```bash
# Database
POSTGRES_DB=olorin
POSTGRES_USER=olorin_user
POSTGRES_PASSWORD=secure_password_change_me
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=redis_secure_password_change_me
REDIS_PORT=6379

# Backend
BACKEND_PORT=8000
JWT_SECRET_KEY=your-32-character-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# API Keys
OPENAI_API_KEY=your-openai-api-key
SPLUNK_TOKEN=your-splunk-token
SPLUNK_HOST=your-splunk-host

# Frontend
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:8000

# Web Portal
PORTAL_PORT=8080
```

### Security Configuration

**Required Changes for Production:**
```bash
# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 48)
```

### Service Ports

Default port mapping:
- **Frontend**: 3000 → 80 (container)
- **Backend**: 8000 → 8000 (container)
- **Web Portal**: 8080 → 80 (container)
- **Database**: 5432 → 5432 (container)
- **Redis**: 6379 → 6379 (container)
- **Proxy**: 80/443 → 80/443 (container)

## Multi-Architecture Support

### Building for Multiple Architectures
```bash
# AMD64 and ARM64
./scripts/docker-build.sh --platform linux/amd64,linux/arm64

# Specific architecture
./scripts/docker-build.sh --platform linux/arm64

# Push multi-arch to registry
./scripts/docker-build.sh \
    --platform linux/amd64,linux/arm64 \
    --registry myregistry.com/olorin \
    --push
```

### Architecture-Specific Packages
```bash
# Build for ARM64 (Apple Silicon, ARM servers)
./scripts/docker-build.sh --platform linux/arm64
./scripts/docker-package.sh --tag arm64

# Build for AMD64 (Intel/AMD servers)
./scripts/docker-build.sh --platform linux/amd64  
./scripts/docker-package.sh --tag amd64
```

## Production Deployment

### With Reverse Proxy
```bash
# Start with nginx proxy
docker compose --profile proxy up -d
```

### SSL/TLS Configuration

1. **Create SSL directory**:
   ```bash
   mkdir -p config/nginx/ssl
   ```

2. **Add certificates**:
   ```bash
   # Copy your certificates
   cp server.crt config/nginx/ssl/
   cp server.key config/nginx/ssl/
   ```

3. **Update nginx config** to enable HTTPS

### Resource Limits

Add to docker-compose.yml:
```yaml
services:
  olorin-backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### Monitoring

Add health check endpoints:
```bash
# Service health
curl http://localhost:8000/health

# Database connection
curl http://localhost:8000/db/health

# Redis connection  
curl http://localhost:8000/cache/health
```

## Backup and Migration

### Database Backup
```bash
# Create backup
docker compose exec olorin-db pg_dump \
    -U olorin_user -d olorin \
    > backup_$(date +%Y%m%d).sql

# Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
docker compose exec olorin-db pg_dump \
    -U olorin_user -d olorin \
    > "$BACKUP_DIR/olorin_backup_$(date +%Y%m%d_%H%M%S).sql"
EOF
```

### Volume Backup
```bash
# Backup all volumes
docker run --rm \
    -v olorin_postgres_data:/data:ro \
    -v $(pwd):/backup \
    alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz -C /data .

docker run --rm \
    -v olorin_redis_data:/data:ro \
    -v $(pwd):/backup \
    alpine tar czf /backup/redis_$(date +%Y%m%d).tar.gz -C /data .
```

### Migration to New Machine

1. **Package current deployment**:
   ```bash
   # Create migration package
   ./scripts/docker-package.sh --tag migration
   
   # Backup data
   ./backup.sh
   ```

2. **Transfer to new machine**:
   ```bash
   # Copy package and backups
   scp olorin-deployment-*.tar.gz backups/*.sql target:~/
   ```

3. **Deploy on new machine**:
   ```bash
   # Extract and deploy
   tar -xzf olorin-deployment-*.tar.gz
   cd olorin-package
   cp .env.example .env
   # Configure .env
   ./deploy.sh
   ```

4. **Restore data**:
   ```bash
   # Stop services
   docker compose down
   
   # Restore database
   docker compose up -d olorin-db
   cat backup_*.sql | docker compose exec -T olorin-db \
       psql -U olorin_user -d olorin
   
   # Start all services
   docker compose up -d
   ```

## Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check port usage
netstat -tulpn | grep :3000

# Change ports in docker-compose.yml
FRONTEND_PORT=3001
```

**Permission Errors**
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
sudo chown -R $USER:$USER ./olorin-package
```

**Memory Issues**
```bash
# Check Docker resources
docker system df
docker system prune

# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory > 4GB+
```

**Image Loading Failures**
```bash
# Verify image files
ls -la images/
file images/*.tar

# Load specific image
docker load -i images/olorin-backend__latest.tar

# Check loaded images
docker images | grep olorin
```

### Service Debugging

**Check Service Health**
```bash
# All services
docker compose ps

# Specific service logs
docker compose logs olorin-backend
docker compose logs olorin-frontend

# Follow logs
docker compose logs -f --tail=100
```

**Database Issues**
```bash
# Connect to database
docker compose exec olorin-db psql -U olorin_user -d olorin

# Check database logs
docker compose logs olorin-db

# Reset database
docker compose down
docker volume rm olorin_postgres_data
docker compose up -d
```

**Network Issues**
```bash
# Check networks
docker network ls

# Inspect network
docker network inspect olorin-network

# Check container connectivity
docker compose exec olorin-backend ping olorin-db
```

### Performance Optimization

**Resource Monitoring**
```bash
# Container resource usage
docker stats

# System resources
docker system df
docker system events
```

**Log Management**
```bash
# Configure log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Recovery Procedures

**Service Recovery**
```bash
# Restart specific service
docker compose restart olorin-backend

# Recreate service
docker compose up -d --force-recreate olorin-backend

# Full system restart
docker compose down && docker compose up -d
```

**Data Recovery**
```bash
# Restore from backup
docker compose down
docker volume rm olorin_postgres_data
docker compose up -d olorin-db
cat backup.sql | docker compose exec -T olorin-db psql -U olorin_user -d olorin
docker compose up -d
```

## Advanced Usage

### Custom Build Context

For development with custom modifications:

```bash
# Build with custom context
docker build \
    --build-arg BUILD_ENV=custom \
    -t olorin-backend:custom \
    ./olorin-server

# Use custom image in compose
export BACKEND_IMAGE=olorin-backend:custom
docker compose up -d
```

### Development Mode

```bash
# Start development environment
docker compose --profile dev up -d

# Mount source code for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Registry Operations

```bash
# Tag for registry
docker tag olorin-backend:latest myregistry.com/olorin-backend:v1.0.0

# Push to registry
docker push myregistry.com/olorin-backend:v1.0.0

# Pull from registry
docker pull myregistry.com/olorin-backend:v1.0.0
```

This comprehensive Docker deployment system enables complete offline deployment of the Olorin fraud detection platform while maintaining production-ready security, scalability, and operational capabilities.