#!/bin/bash
set -euo pipefail

# Olorin Docker Packaging Script
# Creates offline deployment packages with all necessary files

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TAG="${DOCKER_TAG:-latest}"
OUTPUT_DIR="${OUTPUT_DIR:-./olorin-package}"
INCLUDE_IMAGES="${INCLUDE_IMAGES:-true}"
INCLUDE_CONFIG="${INCLUDE_CONFIG:-true}"
INCLUDE_SCRIPTS="${INCLUDE_SCRIPTS:-true}"
INCLUDE_DOCS="${INCLUDE_DOCS:-true}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Package Olorin Docker deployment for offline installation

OPTIONS:
    -t, --tag TAG              Docker tag to package (default: latest)
    -o, --output DIR           Output directory (default: ./olorin-package)
    --no-images                Skip Docker image export
    --no-config                Skip configuration files
    --no-scripts               Skip deployment scripts
    --no-docs                  Skip documentation
    -h, --help                 Show this help message

EXAMPLES:
    $0                                          # Package everything
    $0 --tag v1.0.0 --output /tmp/olorin      # Custom tag and output
    $0 --no-docs --no-scripts                  # Package only images and config

The package will include:
    - Docker images (saved as .tar files)
    - docker-compose.yml and configuration files
    - Deployment and utility scripts
    - Documentation and setup guides
    - Database initialization scripts
    - Environment configuration templates

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --no-images)
            INCLUDE_IMAGES="false"
            shift
            ;;
        --no-config)
            INCLUDE_CONFIG="false"
            shift
            ;;
        --no-scripts)
            INCLUDE_SCRIPTS="false"
            shift
            ;;
        --no-docs)
            INCLUDE_DOCS="false"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Image names
BACKEND_IMAGE="olorin-backend:${TAG}"
FRONTEND_IMAGE="olorin-frontend:${TAG}"
PORTAL_IMAGE="olorin-portal:${TAG}"
POSTGRES_IMAGE="postgres:16-alpine"
REDIS_IMAGE="redis:7-alpine"
NGINX_IMAGE="nginx:1.27-alpine"

# Create output directory
print_status "Creating package directory: $OUTPUT_DIR"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Export Docker images
if [[ "$INCLUDE_IMAGES" == "true" ]]; then
    print_status "Exporting Docker images..."
    mkdir -p "$OUTPUT_DIR/images"
    
    # Check if images exist before exporting
    images_to_export=()
    
    for image in "$BACKEND_IMAGE" "$FRONTEND_IMAGE" "$PORTAL_IMAGE" "$POSTGRES_IMAGE" "$REDIS_IMAGE" "$NGINX_IMAGE"; do
        if docker image inspect "$image" > /dev/null 2>&1; then
            images_to_export+=("$image")
        else
            print_warning "Image $image not found locally, skipping export"
        fi
    done
    
    if [[ ${#images_to_export[@]} -gt 0 ]]; then
        for image in "${images_to_export[@]}"; do
            sanitized_name=$(echo "$image" | tr '/:' '__')
            print_status "Exporting $image as ${sanitized_name}.tar"
            docker save -o "$OUTPUT_DIR/images/${sanitized_name}.tar" "$image"
        done
        
        # Create image manifest
        print_status "Creating image manifest..."
        cat > "$OUTPUT_DIR/images/manifest.txt" << EOF
# Olorin Docker Images Manifest
# Generated on $(date)

# Core application images
$BACKEND_IMAGE
$FRONTEND_IMAGE
$PORTAL_IMAGE

# Infrastructure images  
$POSTGRES_IMAGE
$REDIS_IMAGE
$NGINX_IMAGE

# To load these images on the target machine:
# docker load -i images/image_name.tar

# To load all images at once:
# find images -name "*.tar" -exec docker load -i {} \;
EOF
        
        print_success "Docker images exported successfully"
    else
        print_error "No images found to export. Build images first with ./scripts/docker-build.sh"
        exit 1
    fi
fi

# Copy configuration files
if [[ "$INCLUDE_CONFIG" == "true" ]]; then
    print_status "Copying configuration files..."
    mkdir -p "$OUTPUT_DIR/config"
    
    # Docker Compose files
    cp docker-compose.yml "$OUTPUT_DIR/"
    # Configuration template for Firebase Secrets
    cat > "$OUTPUT_DIR/firebase-config-template.env" << 'EOF'
# Firebase Secrets Manager Configuration Template
# Set these environment variables for production deployment
FIREBASE_PROJECT_ID=olorin-ui
ANTHROPIC_API_KEY_SECRET=olorin/anthropic_api_key
SPLUNK_USERNAME_SECRET=olorin/splunk_username
SPLUNK_PASSWORD_SECRET=olorin/splunk_password
EOF
    
    # Application configurations
    if [[ -d "config" ]]; then
        cp -r config/* "$OUTPUT_DIR/config/" 2>/dev/null || true
    fi
    
    # Create database initialization script
    mkdir -p "$OUTPUT_DIR/scripts"
    cat > "$OUTPUT_DIR/scripts/init-db.sql" << 'EOF'
-- Olorin Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS olorin_app;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA olorin_app TO olorin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA olorin_app TO olorin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA olorin_app TO olorin_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA olorin_app GRANT ALL ON TABLES TO olorin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA olorin_app GRANT ALL ON SEQUENCES TO olorin_user;

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS olorin_app.health_check (
    id SERIAL PRIMARY KEY,
    check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) DEFAULT 'healthy'
);

INSERT INTO olorin_app.health_check (status) VALUES ('healthy');
EOF
    
    # Create nginx configuration for proxy
    mkdir -p "$OUTPUT_DIR/config/nginx"
    cat > "$OUTPUT_DIR/config/nginx/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    error_log   /var/log/nginx/error.log   warn;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json;

    upstream backend {
        server olorin-backend:8000;
    }

    upstream frontend {
        server olorin-frontend:80;
    }

    upstream portal {
        server olorin-web-portal:80;
    }

    server {
        listen 80;
        server_name _;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API routes
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main application
        location /app/ {
            proxy_pass http://frontend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Marketing site (default)
        location / {
            proxy_pass http://portal/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
    
    print_success "Configuration files copied"
fi

# Copy deployment scripts
if [[ "$INCLUDE_SCRIPTS" == "true" ]]; then
    print_status "Copying deployment scripts..."
    mkdir -p "$OUTPUT_DIR/scripts"
    
    # Copy existing scripts
    if [[ -d "scripts" ]]; then
        cp scripts/*.sh "$OUTPUT_DIR/scripts/" 2>/dev/null || true
    fi
    
    # Create deployment script
    cat > "$OUTPUT_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

# Olorin Offline Deployment Script
# Deploys the complete Olorin system from the packaged files

print_status() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_status "Loading Docker images..."
if [[ -d "images" ]]; then
    find images -name "*.tar" -exec docker load -i {} \;
    print_success "All Docker images loaded"
else
    print_error "Images directory not found"
    exit 1
fi

print_status "Setting up environment configuration..."
if [[ ! -f ".env" ]]; then
    if [[ -f "firebase-config-template.env" ]]; then
        cp firebase-config-template.env .env
        print_status "Created .env from Firebase configuration template"
        print_status "⚠️  IMPORTANT: Configure Firebase Secrets Manager with olorin-ui project"
        print_status "Please configure Firebase secrets before deployment"
        read -p "Press Enter to continue after configuring Firebase secrets..."
    else
        print_status "Creating Firebase-based .env file"
        cat > .env << 'EOF'
# Firebase Secrets Manager Configuration
FIREBASE_PROJECT_ID=olorin-ui
ANTHROPIC_API_KEY_SECRET=olorin/anthropic_api_key
EOF
    fi
fi

print_status "Starting Olorin services..."
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

print_success "Olorin deployment completed!"
echo
echo "Services are now running:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - Web Portal: http://localhost:8080"
echo "  - With Proxy: http://localhost (if proxy profile enabled)"
echo
echo "To check service status:"
echo "  docker compose ps"
echo
echo "To view logs:"
echo "  docker compose logs -f [service_name]"
echo
echo "To stop services:"
echo "  docker compose down"
EOF
    
    chmod +x "$OUTPUT_DIR/deploy.sh"
    
    # Create uninstall script
    cat > "$OUTPUT_DIR/uninstall.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

# Olorin Uninstall Script
# Removes all Olorin containers, images, and volumes

print_status() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_warning "This will remove ALL Olorin containers, images, and volumes"
print_warning "This action cannot be undone!"
read -p "Are you sure you want to continue? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

print_status "Stopping and removing containers..."
if docker compose version &> /dev/null; then
    docker compose down --volumes --remove-orphans
else
    docker-compose down --volumes --remove-orphans
fi

print_status "Removing Docker images..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^olorin-" | xargs -r docker rmi -f || true

print_status "Removing volumes..."
docker volume ls --format "{{.Name}}" | grep -E "olorin|postgres|redis" | xargs -r docker volume rm || true

print_success "Olorin uninstall completed!"
EOF
    
    chmod +x "$OUTPUT_DIR/uninstall.sh"
    
    print_success "Deployment scripts created"
fi

# Copy documentation
if [[ "$INCLUDE_DOCS" == "true" ]]; then
    print_status "Copying documentation..."
    mkdir -p "$OUTPUT_DIR/docs"
    
    # Copy essential documentation
    [[ -f "README.md" ]] && cp README.md "$OUTPUT_DIR/"
    [[ -f "CLAUDE.md" ]] && cp CLAUDE.md "$OUTPUT_DIR/"
    
    # Copy docs directory if it exists
    if [[ -d "docs" ]]; then
        cp -r docs/* "$OUTPUT_DIR/docs/" 2>/dev/null || true
    fi
    
    # Create deployment README
    cat > "$OUTPUT_DIR/README.md" << EOF
# Olorin Docker Deployment Package

This package contains everything needed to deploy the Olorin fraud detection system in an offline environment.

## Package Contents

- **images/**: Docker images saved as .tar files
- **docker-compose.yml**: Service orchestration configuration
- **firebase-config-template.env**: Firebase Secrets Manager configuration template
- **scripts/**: Database initialization and utility scripts
- **config/**: Application configuration files
- **docs/**: Complete documentation
- **deploy.sh**: Main deployment script
- **uninstall.sh**: System removal script

## Quick Start

1. **Prerequisites**: Ensure Docker and Docker Compose are installed
2. **Configure**: Set up Firebase Secrets Manager with olorin-ui project
3. **Deploy**: Run \`./deploy.sh\`
4. **Access**: Open http://localhost:3000 for the application

## Detailed Deployment Steps

### 1. Environment Setup

\`\`\`bash
# Copy environment template
# Configure Firebase Secrets Manager
export FIREBASE_PROJECT_ID="olorin-ui"
export ANTHROPIC_API_KEY_SECRET="olorin/anthropic_api_key"

# Edit configuration (required!)
nano .env
\`\`\`

Key settings to configure:
- **POSTGRES_PASSWORD**: Database password
- **REDIS_PASSWORD**: Redis password  
- **JWT_SECRET_KEY**: JWT signing key (32+ characters)
- **OPENAI_API_KEY**: OpenAI API key for AI features

### 2. Load Docker Images

If not using the deploy script:
\`\`\`bash
# Load all images
find images -name "*.tar" -exec docker load -i {} \\;
\`\`\`

### 3. Start Services

\`\`\`bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
\`\`\`

## Service Access

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Web Portal**: http://localhost:8080
- **API Documentation**: http://localhost:8000/docs

## Architecture

The system consists of:

- **olorin-backend**: Python FastAPI service with AI agents
- **olorin-frontend**: React TypeScript application
- **olorin-web-portal**: Marketing website
- **olorin-db**: PostgreSQL database
- **olorin-redis**: Redis cache
- **olorin-proxy**: Nginx reverse proxy (optional)

## Data Persistence

Data is persisted in Docker volumes:
- **postgres_data**: Database files
- **redis_data**: Redis cache
- **backend_logs**: Application logs
- **backend_uploads**: Uploaded files
- **backend_reports**: Generated reports

## Backup and Migration

### Backup Data
\`\`\`bash
# Backup database
docker compose exec olorin-db pg_dump -U olorin_user -d olorin > backup_\$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v postgres_data:/data -v \$(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
\`\`\`

### Restore Data
\`\`\`bash
# Restore database
cat backup_20240101.sql | docker compose exec -T olorin-db psql -U olorin_user -d olorin

# Restore volumes  
docker run --rm -v postgres_data:/data -v \$(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
\`\`\`

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml
2. **Permission errors**: Check file ownership and Docker daemon access
3. **Memory issues**: Increase Docker memory limits
4. **Network issues**: Check firewall and Docker network settings

### Health Checks

\`\`\`bash
# Check service health
docker compose ps

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000/
\`\`\`

### Logs

\`\`\`bash
# View all logs
docker compose logs

# Follow specific service
docker compose logs -f olorin-backend

# Search logs
docker compose logs | grep -i error
\`\`\`

## Security Considerations

1. **Change default passwords** in .env file
2. **Use strong JWT secrets** (32+ characters)
3. **Configure firewall** rules for production
4. **Enable HTTPS** with SSL certificates
5. **Regular security updates** for base images

## Production Deployment

For production use:

1. Use a reverse proxy with SSL/TLS
2. Configure monitoring and logging
3. Set up automated backups
4. Implement proper secret management
5. Use Docker secrets or external secret management

## Support

For issues and documentation:
- Check the docs/ directory
- Review Docker Compose logs
- Verify environment configuration
- Ensure all required services are healthy

## Version Information

- Package created: $(date)
- Docker tag: ${TAG}
- Components: Backend, Frontend, Web Portal, Database, Cache

EOF
    
    print_success "Documentation copied"
fi

# Create package metadata
print_status "Creating package metadata..."
cat > "$OUTPUT_DIR/package-info.json" << EOF
{
    "name": "olorin-docker-package",
    "version": "${TAG}",
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "created_by": "$(whoami)@$(hostname)",
    "components": {
        "backend": "${BACKEND_IMAGE}",
        "frontend": "${FRONTEND_IMAGE}",
        "portal": "${PORTAL_IMAGE}",
        "database": "${POSTGRES_IMAGE}",
        "cache": "${REDIS_IMAGE}",
        "proxy": "${NGINX_IMAGE}"
    },
    "includes": {
        "images": ${INCLUDE_IMAGES},
        "config": ${INCLUDE_CONFIG},
        "scripts": ${INCLUDE_SCRIPTS},
        "docs": ${INCLUDE_DOCS}
    },
    "requirements": {
        "docker": ">=20.10.0",
        "docker-compose": ">=1.29.0 or docker compose",
        "disk_space": "~2-4GB",
        "memory": ">=4GB recommended"
    }
}
EOF

# Create archive
print_status "Creating deployment archive..."
ARCHIVE_NAME="olorin-deployment-${TAG}-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "${ARCHIVE_NAME}" -C "$(dirname "$OUTPUT_DIR")" "$(basename "$OUTPUT_DIR")"

# Calculate sizes
PACKAGE_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_NAME" | cut -f1)

print_success "Olorin Docker package created successfully!"
echo
echo "Package Details:"
echo "  - Directory: $OUTPUT_DIR ($PACKAGE_SIZE)"
echo "  - Archive: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
echo "  - Tag: $TAG"
echo "  - Components:"
[[ "$INCLUDE_IMAGES" == "true" ]] && echo "    ✓ Docker images"
[[ "$INCLUDE_CONFIG" == "true" ]] && echo "    ✓ Configuration files"
[[ "$INCLUDE_SCRIPTS" == "true" ]] && echo "    ✓ Deployment scripts" 
[[ "$INCLUDE_DOCS" == "true" ]] && echo "    ✓ Documentation"
echo
echo "To deploy on target machine:"
echo "  1. Extract: tar -xzf $ARCHIVE_NAME"
echo "  2. Configure: cd $(basename "$OUTPUT_DIR") && # Configure Firebase Secrets Manager
export FIREBASE_PROJECT_ID="olorin-ui"
export ANTHROPIC_API_KEY_SECRET="olorin/anthropic_api_key" && nano .env"
echo "  3. Deploy: ./deploy.sh"
echo
print_status "Package creation completed at $(date)"