#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Starting Olorin Frontend Performance Monitoring${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed. Please install Docker to run monitoring stack."
        exit 1
    fi

    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    print_success "Docker and Docker Compose are available"
}

# Create monitoring directories
create_directories() {
    print_step "Creating Monitoring Directories"

    mkdir -p monitoring/data/prometheus
    mkdir -p monitoring/data/grafana
    mkdir -p monitoring/logs
    mkdir -p letsencrypt

    print_success "Monitoring directories created"
}

# Start monitoring stack
start_monitoring_stack() {
    print_step "Starting Monitoring Stack"

    # Check if monitoring services are already running
    if docker-compose -f docker-compose.production.yml ps | grep -q "prometheus\|grafana"; then
        print_warning "Monitoring services are already running"
        docker-compose -f docker-compose.production.yml restart prometheus grafana
    else
        docker-compose -f docker-compose.production.yml up -d prometheus grafana redis
    fi

    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10

    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_step "Checking Service Health"

    local failed_services=()

    # Check Prometheus
    if curl -sf http://localhost:9090/-/healthy >/dev/null 2>&1; then
        print_success "Prometheus is healthy"
    else
        print_error "Prometheus health check failed"
        failed_services+=("prometheus")
    fi

    # Check Grafana
    if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
        print_success "Grafana is healthy"
    else
        print_error "Grafana health check failed"
        failed_services+=("grafana")
    fi

    # Check Redis
    if docker exec olorin-redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is healthy"
    else
        print_error "Redis health check failed"
        failed_services+=("redis")
    fi

    if [ ${#failed_services[@]} -gt 0 ]; then
        print_error "Some services failed health checks: ${failed_services[*]}"
        return 1
    fi

    print_success "All monitoring services are healthy"
}

# Configure Grafana dashboards
configure_grafana() {
    print_step "Configuring Grafana Dashboards"

    # Wait for Grafana to be fully ready
    echo "Waiting for Grafana to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_error "Grafana did not become ready in time"
        return 1
    fi

    # Import dashboards (if API is available)
    echo "Dashboards will be automatically provisioned from monitoring/grafana/dashboards/"
    print_success "Grafana dashboard configuration completed"
}

# Set up performance monitoring endpoints
setup_monitoring_endpoints() {
    print_step "Setting up Performance Monitoring Endpoints"

    # Create nginx configuration for metrics endpoint
    cat > monitoring/nginx-metrics.conf << 'EOF'
location /metrics {
    access_log off;

    # Return basic nginx metrics
    content_by_lua_block {
        ngx.header["Content-Type"] = "text/plain"
        ngx.say("# HELP nginx_up Nginx server status")
        ngx.say("# TYPE nginx_up gauge")
        ngx.say("nginx_up 1")

        ngx.say("# HELP nginx_connections_active Active client connections")
        ngx.say("# TYPE nginx_connections_active gauge")
        ngx.say("nginx_connections_active " .. ngx.var.connections_active)

        ngx.say("# HELP nginx_requests_total Total client requests")
        ngx.say("# TYPE nginx_requests_total counter")
        ngx.say("nginx_requests_total " .. ngx.var.request_id)
    }
}
EOF

    print_success "Monitoring endpoints configured"
}

# Generate monitoring documentation
generate_docs() {
    print_step "Generating Monitoring Documentation"

    cat > monitoring/README.md << 'EOF'
# Olorin Frontend Performance Monitoring

This directory contains the performance monitoring setup for the Olorin frontend microservices.

## Services

### Prometheus (http://localhost:9090)
- Metrics collection and storage
- Scrapes metrics from all microservices
- Configured to collect Web Vitals, Module Federation metrics, and service health

### Grafana (http://localhost:3001)
- Dashboard and visualization
- Pre-configured dashboards for:
  - Service overview
  - Module Federation performance
  - Web Vitals tracking
  - Error monitoring

### Redis (localhost:6379)
- Caching and session storage
- Performance data buffering

## Default Credentials

- Grafana: admin / admin (change on first login)
- Redis: Password set via REDIS_PASSWORD environment variable

## Monitoring URLs

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Individual service metrics: http://localhost:300X/metrics (where X is service port)

## Available Dashboards

1. **Olorin Frontend Overview** - High-level service metrics
2. **Module Federation Performance** - Remote loading times and errors
3. **Web Vitals** - Core Web Vitals tracking
4. **Service Health** - Individual service health and performance

## Custom Metrics

The monitoring setup tracks:
- Service startup times
- Module Federation load times
- Web Vitals (FCP, LCP, FID, CLS)
- User interaction response times
- Memory usage per service
- Error rates and types
- Bundle sizes

## Configuration

- Prometheus config: `monitoring/prometheus.yml`
- Grafana datasources: `monitoring/grafana/datasources/`
- Grafana dashboards: `monitoring/grafana/dashboards/`

## Alerts

Alerts are configured for:
- Service downtime
- High error rates (>5%)
- Poor Web Vitals scores
- High memory usage
- Slow module loading times

EOF

    print_success "Monitoring documentation generated"
}

# Display monitoring information
show_monitoring_info() {
    print_step "Monitoring Stack Information"

    echo -e "${GREEN}🎉 Monitoring stack started successfully!${NC}\n"

    echo -e "${BLUE}Access URLs:${NC}"
    echo "📊 Grafana Dashboard: http://localhost:3001"
    echo "🔍 Prometheus: http://localhost:9090"
    echo "💾 Redis: localhost:6379"
    echo ""

    echo -e "${BLUE}Service Metrics:${NC}"
    echo "🏠 Shell Service: http://localhost:3000/metrics"
    echo "🔍 Investigation: http://localhost:3001/metrics"
    echo "📈 Agent Analytics: http://localhost:3002/metrics"
    echo "🧠 RAG Intelligence: http://localhost:3003/metrics"
    echo "📊 Visualization: http://localhost:3004/metrics"
    echo "📄 Reporting: http://localhost:3005/metrics"
    echo "🎨 Core UI: http://localhost:3006/metrics"
    echo "🎯 Design System: http://localhost:3007/metrics"
    echo ""

    echo -e "${BLUE}Default Credentials:${NC}"
    echo "Grafana: admin / admin (please change on first login)"
    echo ""

    echo -e "${BLUE}Documentation:${NC}"
    echo "📚 Monitoring Guide: monitoring/README.md"
    echo ""

    echo -e "${YELLOW}⚠️  Remember to:${NC}"
    echo "1. Change Grafana admin password on first login"
    echo "2. Configure alerting channels in Grafana"
    echo "3. Set up SSL certificates for production"
    echo "4. Configure backup for monitoring data"
}

# Main execution
main() {
    check_docker
    create_directories
    start_monitoring_stack
    configure_grafana
    setup_monitoring_endpoints
    generate_docs
    show_monitoring_info
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --stop)
            print_step "Stopping Monitoring Stack"
            docker-compose -f docker-compose.production.yml stop prometheus grafana redis
            print_success "Monitoring stack stopped"
            exit 0
            ;;
        --restart)
            print_step "Restarting Monitoring Stack"
            docker-compose -f docker-compose.production.yml restart prometheus grafana redis
            check_service_health
            print_success "Monitoring stack restarted"
            exit 0
            ;;
        --status)
            print_step "Monitoring Stack Status"
            docker-compose -f docker-compose.production.yml ps prometheus grafana redis
            check_service_health
            exit 0
            ;;
        --logs)
            docker-compose -f docker-compose.production.yml logs -f prometheus grafana redis
            exit 0
            ;;
        *)
            print_error "Unknown argument: $1"
            echo "Usage: $0 [--stop|--restart|--status|--logs]"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"