# Olorin Ecosystem - Port Reference Guide

**Last Updated:** 2026-01-22
**Status:** ✅ All conflicts resolved

## Quick Reference

### Frontend Services (3000-3399)

| Port | Service | Project | Status |
|------|---------|---------|--------|
| **Fraud Detection (3000-3099)** |
| 3000 | Shell (Main) | olorin-fraud | ✅ Active |
| 3001 | Investigation | olorin-fraud | ✅ Active |
| 3002 | Agent Analytics | olorin-fraud | ✅ Active |
| 3003 | RAG Intelligence | olorin-fraud | ✅ Active |
| 3004 | Visualization | olorin-fraud | ✅ Active |
| 3005 | Reporting | olorin-fraud | ✅ Active |
| 3006 | Core UI | olorin-fraud | ✅ Active |
| 3007 | Design System | olorin-fraud | ✅ Active |
| 3008 | Investigations Mgmt | olorin-fraud | ✅ Active |
| 3009 | Financial Analysis | olorin-fraud | ✅ Active |
| **CVPlus (3100-3199)** |
| 3100 | Frontend | olorin-cv/cvplus | ✅ Active |
| **Media (3200-3299)** |
| 3200 | Bayit+ Web | olorin-media/bayit-plus | ✅ Active |
| 3201 | Israeli Radio | olorin-media/israeli-radio | ✅ Active |
| **Portals (3300-3399)** |
| 3301 | Portal Fraud | olorin-portals | ✅ Active |
| 3302 | Portal Streaming | olorin-portals | ✅ Active |
| 3303 | Portal Radio | olorin-portals | 🔶 Reserved |
| 3304 | Portal Omen | olorin-portals | ✅ Active |
| 3305 | Portal Main | olorin-portals | ✅ Active |

### Backend Services (5000-8999)

| Port | Service | Project | Status |
|------|---------|---------|--------|
| 5001 | Firebase Functions (Local) | olorin-cv/cvplus | ✅ Active |
| 8000 | Backend API | olorin-media/bayit-plus | ✅ Active |
| 8001 | Backend API | olorin-media/israeli-radio | 🔶 Reserved |
| 8080 | Web Portal (Docker) | olorin (root) | ✅ Active |
| 8090 | Backend API | olorin-fraud | ✅ Active |
| 8180 | Python Backend | olorin-cv/cvplus | ✅ Active |

### Infrastructure (Standard Ports)

| Port | Service | Project | Status |
|------|---------|---------|--------|
| 5432 | PostgreSQL | olorin (root) | ✅ Active |
| 6379 | Redis | olorin (root) | ✅ Active |
| 80 | Nginx HTTP | olorin (root) | ✅ Active |
| 443 | Nginx HTTPS | olorin (root) | ✅ Active |

---

## Usage Examples

### Starting All Services

```bash
# Start everything with automatic port conflict resolution
npm run dev:all

# Or use the script directly
./scripts/dev-servers-start.sh --all --kill-first
```

### Starting Specific Projects

```bash
# Fraud Detection only (10 services)
npm run dev:all:fraud

# CVPlus only (frontend + backend)
npm run dev:all:cv

# Media services only (Bayit+ + Israeli Radio)
npm run dev:all:media

# Portals only (5 marketing sites)
npm run dev:all:portals
```

### Stopping Services

```bash
# Graceful stop
npm run dev:stop

# Force kill everything
npm run dev:kill

# Or use the script directly
./scripts/dev-servers-stop.sh --all
```

### Advanced Usage

```bash
# Start with verbose logging
./scripts/dev-servers-start.sh --all --verbose

# Kill processes on ports before starting
./scripts/dev-servers-start.sh --fraud --kill-first

# Force stop (SIGKILL instead of SIGTERM)
./scripts/dev-servers-stop.sh --force
```

---

## Service URLs

### Fraud Detection
- **Shell:** http://localhost:3000
- **Investigation:** http://localhost:3001
- **Analytics:** http://localhost:3002
- **RAG:** http://localhost:3003
- **Visualization:** http://localhost:3004
- **Reporting:** http://localhost:3005
- **Core UI:** http://localhost:3006
- **Design System:** http://localhost:3007
- **Investigations Mgmt:** http://localhost:3008
- **Financial:** http://localhost:3009
- **Backend API:** http://localhost:8090

### CVPlus
- **Frontend:** http://localhost:3100
- **Backend API:** http://localhost:8180
- **Firebase Functions:** http://localhost:5001

### Media
- **Bayit+ Web:** http://localhost:3200
- **Bayit+ Backend:** http://localhost:8000
- **Israeli Radio:** http://localhost:3201
- **Radio Backend:** http://localhost:8001

### Portals
- **Fraud Portal:** http://localhost:3301
- **Streaming Portal:** http://localhost:3302
- **Omen Portal:** http://localhost:3304
- **Main Portal:** http://localhost:3305

---

## Configuration Files

### Frontend Port Changes

| File | Old Port | New Port |
|------|----------|----------|
| `olorin-cv/cvplus/frontend/vite.config.ts` | 3000 | 3100 |
| `olorin-cv/cvplus/frontend/.env` | - | Updated API URLs |
| `olorin-media/bayit-plus/web/vite.config.js` | 3000 | 3200 |
| `olorin-portals/packages/portal-fraud/package.json` | 3001 | 3301 |
| `olorin-portals/packages/portal-streaming/package.json` | 3002 | 3302 |
| `olorin-portals/packages/portal-omen/package.json` | 3004 | 3304 |
| `olorin-portals/packages/portal-main/package.json` | 3005 | 3305 |

### Backend Port Changes

| File | Old Port | New Port |
|------|----------|----------|
| `olorin-cv/cvplus/python-backend/.env.example` | 8080 | 8180 |
| `olorin-cv/cvplus/frontend/.env.example` | API refs to 5001 | API refs to 8180 |

---

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Check what's using a port
lsof -i :3000

# Kill a specific port
lsof -ti:3000 | xargs kill -9

# Or use the stop script with --all
npm run dev:kill
```

### Service Won't Start

1. **Check logs:**
   ```bash
   # Logs are in logs/ directory
   tail -f logs/dev-servers-*.log
   tail -f logs/fraud-backend.log
   tail -f logs/cvplus-frontend.log
   ```

2. **Verify dependencies:**
   ```bash
   cd olorin-fraud/frontend && npm install
   cd olorin-cv/cvplus/python-backend && poetry install
   ```

3. **Check environment variables:**
   ```bash
   # Make sure .env files exist
   ls -la olorin-cv/cvplus/frontend/.env
   ls -la olorin-cv/cvplus/python-backend/.env
   ```

### All Services Failed to Start

```bash
# Nuclear option: kill everything and restart
npm run dev:kill
npm run dev:all
```

---

## Port Allocation Strategy

### Range Allocation
- **3000-3099:** Olorin Fraud Detection (10 microservices)
- **3100-3199:** Olorin CVPlus
- **3200-3299:** Olorin Media (Bayit+, Israeli Radio)
- **3300-3399:** Olorin Portals (marketing sites)
- **8000-8999:** Backend APIs
- **5000-5999:** Firebase/Cloud services

### Reserved Ports
The following ports are reserved for future services:
- **3010-3099:** Additional fraud detection microservices
- **3101-3199:** CVPlus mobile apps
- **3203-3299:** Additional media platforms
- **3303, 3306-3399:** Future portals

---

## Migration Notes

### Changes Implemented (2026-01-22)

1. ✅ CVPlus frontend: 3000 → 3100
2. ✅ CVPlus backend: 8080 → 8180
3. ✅ Bayit+ web: 3000 → 3200
4. ✅ Portal Fraud: 3001 → 3301
5. ✅ Portal Streaming: 3002 → 3302
6. ✅ Portal Omen: 3004 → 3304
7. ✅ Portal Main: 3005 → 3305
8. ✅ Created start/stop scripts
9. ✅ Added npm scripts for orchestration

### Breaking Changes
- **CVPlus:** Frontend now runs on port 3100 (was 3000)
- **CVPlus:** Backend now runs on port 8180 (was 8080)
- **Bayit+:** Web now runs on port 3200 (was 3000)
- **All Portals:** Moved to 3300+ range

### Update Your Bookmarks
If you had bookmarked any local development URLs, update them:
- CVPlus: http://localhost:3000 → http://localhost:3100
- Bayit+: http://localhost:3000 → http://localhost:3200

---

## Scripts Reference

### Bash Scripts
- `scripts/dev-servers-start.sh` - Start all development servers
- `scripts/dev-servers-stop.sh` - Stop all development servers

### NPM Scripts
- `npm run dev:all` - Start all services
- `npm run dev:all:fraud` - Start fraud detection services
- `npm run dev:all:cv` - Start CVPlus services
- `npm run dev:all:media` - Start media services
- `npm run dev:all:portals` - Start portal services
- `npm run dev:stop` - Stop all services
- `npm run dev:kill` - Force kill all services

---

## Additional Resources

- **Port Audit Report:** `OLORIN_PORT_AUDIT_REPORT.md`
- **Project Documentation:** `CLAUDE.md`
- **Development Guide:** `docs/STARTUP_GUIDE.md`

---

**Maintenance:** Review this document monthly and update port allocations as new services are added.
