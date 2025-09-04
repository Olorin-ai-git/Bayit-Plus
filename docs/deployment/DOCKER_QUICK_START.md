# Olorin Docker Quick Start

Fastest way to get Olorin running with Docker - both online and fully offline deployment.

## 🚀 Quick Online Deployment (5 minutes)

If you have internet connectivity:

```bash
# 1. Clone and configure
git clone <repository-url>
cd olorin
cp .env.docker .env
nano .env  # Edit passwords and API keys

# 2. Build and start
./scripts/docker-build.sh
docker compose up -d

# 3. Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8090/docs  
# Web Portal: http://localhost:8080
```

## 📦 Offline Package Creation

Create a complete offline deployment package:

```bash
# Build all images
./scripts/docker-build.sh

# Create offline package (includes everything)
./scripts/docker-package.sh

# Result: olorin-deployment-latest-YYYYMMDD-HHMMSS.tar.gz
```

## 🏝️ Offline Deployment

Deploy on any machine without internet:

```bash
# 1. Transfer and extract package
tar -xzf olorin-deployment-*.tar.gz
cd olorin-package

# 2. Configure
# Set required environment variables or use Firebase Secrets Manager
export FIREBASE_PROJECT_ID="olorin-ui"
export ANTHROPIC_API_KEY_SECRET="olorin/anthropic_api_key"
# Configure other environment variables as needed

# 3. Deploy
./deploy.sh

# 4. Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8090
# Portal: http://localhost:8080
```

## ⚙️ Essential Configuration

Edit `.env` file with these required settings:

```bash
# Security (REQUIRED - change these!)
POSTGRES_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password  
JWT_SECRET_KEY=your_32_plus_character_secret_key

# API Keys (for AI features)
OPENAI_API_KEY=your_openai_key
SPLUNK_TOKEN=your_splunk_token  # Optional

# Ports (if defaults conflict)
FRONTEND_PORT=3000
BACKEND_PORT=8090
PORTAL_PORT=8080
```

## 🔧 Common Commands

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f

# Restart services  
docker compose restart

# Stop everything
docker compose down

# Full cleanup (removes data!)
docker compose down --volumes
```

## 🆘 Quick Troubleshooting

**Services won't start?**
```bash
docker compose logs    # Check error messages
docker compose down && docker compose up -d   # Restart all
```

**Port conflicts?**
```bash
# Change ports in .env file
FRONTEND_PORT=3001
BACKEND_PORT=8001
```

**Can't connect to database?**
```bash
# Reset database
docker compose down
docker volume rm olorin_postgres_data
docker compose up -d
```

## 📋 System Requirements

- **Docker Engine**: 20.10+
- **Docker Compose**: 1.29+ or Docker Compose V2
- **RAM**: 4GB+ recommended  
- **Disk**: 4GB+ available space
- **OS**: Linux, macOS, Windows with WSL2

## 🏗️ Architecture Overview

- **olorin-backend**: Python FastAPI + AI agents
- **olorin-frontend**: React TypeScript app
- **olorin-web-portal**: Marketing website
- **PostgreSQL**: Primary database
- **Redis**: Caching layer
- **Nginx**: Reverse proxy (optional)

## 📚 Full Documentation

For complete details, see: `docs/deployment/DOCKER_DEPLOYMENT_GUIDE.md`

## 🔐 Security Notes

- **Change all default passwords** before production use
- **Use strong JWT secrets** (32+ characters minimum)
- **Configure firewall** rules for production deployment
- **Enable HTTPS** with SSL certificates for external access

---

**Need help?** Check the troubleshooting section in the full deployment guide or review service logs with `docker compose logs`.