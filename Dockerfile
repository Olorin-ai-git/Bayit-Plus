# Multi-stage Dockerfile for Olorin Frontend + Backend
FROM node:18-alpine AS frontend-build

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY olorin-front/package*.json ./
RUN npm install

# Copy frontend source and build
COPY olorin-front/ ./
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend-base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY olorin-server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY olorin-server/ ./
COPY olorin-server/agents.py ./

# Create necessary directories
RUN mkdir -p /app/static /var/log/nginx /var/lib/nginx/body /var/lib/nginx/proxy \
    && chown -R appuser:appuser /app /var/log/nginx /var/lib/nginx

# Copy frontend build to backend static directory
COPY --from=frontend-build /app/frontend/build /app/static/

# Production stage
FROM backend-base AS production

# Configure nginx
COPY <<EOF /etc/nginx/nginx.conf
user appuser;
worker_processes auto;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Upstream for Python backend
    upstream backend {
        server 127.0.0.1:8090;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Serve static frontend files
        location / {
            root /app/static;
            try_files \$uri \$uri/ /index.html;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }
        
        # Proxy API requests to backend
        location /api {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Health check endpoint
        location /health {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
        
        # Documentation endpoints
        location ~ ^/(docs|redoc|openapi.json) {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/bash
set -e

echo "🚀 Starting Olorin Application..."

# Start nginx in background
echo "📡 Starting Nginx..."
nginx

# Start Python backend
echo "🐍 Starting Python Backend..."
cd /app
PYTHONPATH=. python app/local_server.py &

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:8090/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ \$i -eq 30 ]; then
        echo "❌ Backend failed to start"
        exit 1
    fi
    sleep 2
done

echo "🎉 Olorin Application is running!"
echo "📍 Frontend: http://localhost:80"
echo "📍 Backend API: http://localhost:80/api"
echo "📍 API Docs: http://localhost:80/docs"

# Keep container running
wait
EOF

# Make startup script executable
RUN chmod +x /app/start.sh

# Set proper ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start the application
CMD ["/app/start.sh"] 