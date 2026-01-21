# Multi-stage Docker build for Autonomous Investigation Microservice
# Optimized for production deployment with Module Federation

# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY ../../package.json ../../package.json
COPY ../../package-lock.json ../../package-lock.json

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .
COPY ../../src/shared ./src/shared

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Install Node.js for serving Module Federation remotes
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html/autonomous-investigation

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create environment configuration script
RUN echo '#!/bin/sh' > /docker-entrypoint.d/01-env-config.sh && \
    echo 'envsubst < /usr/share/nginx/html/autonomous-investigation/config.template.js > /usr/share/nginx/html/autonomous-investigation/config.js' >> /docker-entrypoint.d/01-env-config.sh && \
    chmod +x /docker-entrypoint.d/01-env-config.sh

# Environment variables for runtime configuration
ENV REACT_APP_API_BASE_URL=http://localhost:8090
ENV REACT_APP_WEBSOCKET_URL=ws://localhost:8090/ws
ENV REACT_APP_MONITORING_ENABLED=true
ENV REACT_APP_MF_SHELL_URL=http://localhost:3000/remoteEntry.js
ENV REACT_APP_MF_CORE_UI_URL=http://localhost:3006/remoteEntry.js
ENV REACT_APP_MF_INVESTIGATION_URL=http://localhost:3001/remoteEntry.js
ENV REACT_APP_MF_AGENT_ANALYTICS_URL=http://localhost:3002/remoteEntry.js
ENV REACT_APP_MF_VISUALIZATION_URL=http://localhost:3004/remoteEntry.js
ENV REACT_APP_MF_REPORTING_URL=http://localhost:3005/remoteEntry.js

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/autonomous-investigation/health || exit 1

# Expose port
EXPOSE 80

# Labels for metadata
LABEL org.opencontainers.image.title="Olorin Autonomous Investigation Microservice"
LABEL org.opencontainers.image.description="Autonomous fraud investigation UI microservice with Module Federation"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Olorin"
LABEL org.opencontainers.image.authors="Gil Klainert"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]