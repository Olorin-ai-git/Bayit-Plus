# Multi-stage build for Olorin Web Portal
FROM node:18-alpine AS deps

# Install dependencies only when needed
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --legacy-peer-deps --only=production && npm cache clean --force

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Install all dependencies (including dev)
RUN npm ci --legacy-peer-deps

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.27-alpine AS runner

# Copy built app to nginx html directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration for multi-language support
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Multi-language support
    location ~ ^/([a-z]{2})(/.*)?$ {
        try_files \$uri \$uri/ /\$1/index.html /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
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

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]