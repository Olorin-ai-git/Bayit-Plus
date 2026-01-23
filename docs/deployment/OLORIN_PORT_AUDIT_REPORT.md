# Olorin Ecosystem - Local Development Port Audit Report

**Generated:** 2026-01-22
**Status:** ⚠️ CRITICAL PORT CONFLICTS DETECTED

## Executive Summary

This audit identifies **9 major port conflicts** across the Olorin ecosystem that will prevent simultaneous local development of multiple projects. **Immediate action required** to reassign ports for conflict-free development.

---

## Port Allocation Overview

### ✅ Currently Assigned Ports

| Port | Service | Project | Config Source |
|------|---------|---------|---------------|
| **Frontend Services** |
| 3000 | Shell (Main) | olorin-fraud | webpack.config.js |
| 3001 | Investigation Service | olorin-fraud | webpack.config.js |
| 3002 | Agent Analytics Service | olorin-fraud | webpack.config.js |
| 3003 | RAG Intelligence Service | olorin-fraud | webpack.config.js |
| 3004 | Visualization Service | olorin-fraud | webpack.config.js |
| 3005 | Reporting Service | olorin-fraud | webpack.config.js |
| 3006 | Core UI Service | olorin-fraud | webpack.config.js |
| 3007 | Design System Service | olorin-fraud | webpack.config.js |
| 3008 | Investigations Mgmt Service | olorin-fraud | webpack.config.js |
| 3009 | Financial Analysis Service | olorin-fraud | webpack.config.js |
| 3000 | Frontend | olorin-cv/cvplus | vite.config.ts |
| 3000 | Web | olorin-media/bayit-plus | vite.config.js |
| 3001 | Frontend | olorin-media/israeli-radio | vite.config.ts |
| 3001 | Portal Fraud | olorin-portals | package.json |
| 3002 | Portal Streaming | olorin-portals | package.json |
| 3003 | Portal Radio | olorin-portals | package.json |
| 3004 | Portal Omen | olorin-portals | package.json |
| 3005 | Portal Main | olorin-portals | package.json |
| **Backend Services** |
| 5001 | Firebase Functions (Local) | olorin-cv/cvplus | .env.example |
| 8000 | Backend API | olorin-media/bayit-plus | docker-compose.yml |
| 8001 | Backend API | olorin-media/israeli-radio | vite proxy config |
| 8080 | Python Backend | olorin-cv/cvplus | .env.example |
| 8090 | Backend API | olorin-fraud | docker-compose.yml |
| **Infrastructure** |
| 5432 | PostgreSQL | olorin (root) | docker-compose.yml |
| 6379 | Redis | olorin (root) | docker-compose.yml |
| 80 | Nginx Proxy (HTTP) | olorin (root) | docker-compose.yml |
| 443 | Nginx Proxy (HTTPS) | olorin (root) | docker-compose.yml |

---

## 🚨 CRITICAL PORT CONFLICTS

### Conflict #1: Port 3000 (4-way conflict)
**Severity:** CRITICAL

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Frontend Shell | `frontend/webpack.config.js:25` |
| olorin-cv/cvplus | Frontend | `frontend/vite.config.ts:34` |
| olorin-media/bayit-plus | Web | `web/vite.config.js:24` |
| docker-compose | Frontend Container | `docker-compose.yml:95` |

**Impact:** Cannot run fraud detection, CV builder, and Bayit+ simultaneously.

**Recommended Fix:**
```bash
# Keep fraud detection on 3000
# Move CVPlus to 3100
# Move Bayit+ Web to 3200
# Update docker-compose to use host network or different port
```

---

### Conflict #2: Port 3001 (3-way conflict)
**Severity:** HIGH

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Investigation Service | `frontend/webpack.config.js:46` |
| olorin-media/israeli-radio | Frontend | `frontend/vite.config.ts:8` |
| olorin-portals | Portal Fraud | `packages/portal-fraud/package.json:25` |

**Impact:** Fraud investigation microservice conflicts with radio manager and fraud portal.

**Recommended Fix:**
```bash
# Keep fraud investigation service on 3001
# Move Israeli Radio to 3101
# Move Portal Fraud to 3301
```

---

### Conflict #3: Port 3002 (2-way conflict)
**Severity:** MEDIUM

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Agent Analytics Service | `frontend/webpack.config.js:63` |
| olorin-portals | Portal Streaming | `packages/portal-streaming/package.json:32` |

**Impact:** Cannot run fraud analytics and streaming portal together.

**Recommended Fix:**
```bash
# Keep fraud analytics on 3002
# Move Portal Streaming to 3302
```

---

### Conflict #4: Port 3003 (2-way conflict)
**Severity:** MEDIUM

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | RAG Intelligence Service | `frontend/webpack.config.js:80` |
| olorin-portals | Portal Radio | `packages/portal-radio/package.json:27` |

**Impact:** Cannot run fraud RAG service and radio portal together.

**Recommended Fix:**
```bash
# Keep fraud RAG service on 3003
# Move Portal Radio to 3303
```

---

### Conflict #5: Port 3004 (2-way conflict)
**Severity:** MEDIUM

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Visualization Service | `frontend/webpack.config.js:95` |
| olorin-portals | Portal Omen | `packages/portal-omen/package.json:28` |

**Impact:** Cannot run fraud visualization and omen portal together.

**Recommended Fix:**
```bash
# Keep fraud visualization on 3004
# Move Portal Omen to 3304
```

---

### Conflict #6: Port 3005 (2-way conflict)
**Severity:** MEDIUM

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Reporting Service | `frontend/webpack.config.js:113` |
| olorin-portals | Portal Main | `packages/portal-main/package.json:25` |

**Impact:** Cannot run fraud reporting and main portal together.

**Recommended Fix:**
```bash
# Keep fraud reporting on 3005
# Move Portal Main to 3305
```

---

### Conflict #7: Port 8080 (2-way conflict)
**Severity:** MEDIUM

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-cv/cvplus | Python Backend | `python-backend/.env.example:10` |
| docker-compose | Web Portal Container | `docker-compose.yml:116` |

**Impact:** CVPlus backend conflicts with containerized web portal.

**Recommended Fix:**
```bash
# Move CVPlus backend to 8180
# Keep web portal on 8080
```

---

### Conflict #8: Port 8090 (2-way conflict)
**Severity:** LOW (Same service)

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-fraud | Backend API | `backend/.env` (implied) |
| docker-compose | Backend Container | `docker-compose.yml:65` |

**Impact:** None - this is the same backend service, different deployment methods.

**Action:** Document that local dev uses 8090, containerized deployment also uses 8090 (not simultaneous).

---

### Conflict #9: Port 8000 (Bayit+ Backend - No direct conflict)
**Severity:** INFO

| Project | Service | Config Location |
|---------|---------|-----------------|
| olorin-media/bayit-plus | Backend API | `docker-compose.yml:97`, `INSTALLATION_GUIDE.md` |

**Impact:** None currently, but should be documented to avoid future conflicts.

**Action:** Reserve 8000 for Bayit+ backend exclusively.

---

## Recommended Port Allocation Plan

### Frontend Services (3000-3999)

#### Olorin Fraud Detection (3000-3099)
```
3000 - Shell (Main)
3001 - Investigation Service
3002 - Agent Analytics Service
3003 - RAG Intelligence Service
3004 - Visualization Service
3005 - Reporting Service
3006 - Core UI Service
3007 - Design System Service
3008 - Investigations Management Service
3009 - Financial Analysis Service
```

#### Olorin CV (CVPlus) (3100-3199)
```
3100 - Frontend (CHANGED from 3000)
```

#### Olorin Media (3200-3299)
```
3200 - Bayit+ Web (CHANGED from 3000)
3201 - Israeli Radio Frontend (CHANGED from 3001)
```

#### Olorin Portals (3300-3399)
```
3300 - Reserved for future portal
3301 - Portal Fraud (CHANGED from 3001)
3302 - Portal Streaming (CHANGED from 3002)
3303 - Portal Radio (CHANGED from 3003)
3304 - Portal Omen (CHANGED from 3004)
3305 - Portal Main (CHANGED from 3005)
```

### Backend Services (8000-8999)

```
5001 - Firebase Functions (CVPlus Local Emulator)
8000 - Bayit+ Backend
8001 - Israeli Radio Backend
8080 - Web Portal Container (Docker)
8090 - Fraud Detection Backend
8180 - CVPlus Python Backend (CHANGED from 8080)
```

### Infrastructure (Standard Ports)

```
5432 - PostgreSQL
6379 - Redis
80   - Nginx HTTP
443  - Nginx HTTPS
```

---

## Implementation Checklist

### Phase 1: Olorin CV (CVPlus)
- [ ] Update `olorin-cv/cvplus/frontend/vite.config.ts` - Change port 3000 → 3100
- [ ] Update `olorin-cv/cvplus/python-backend/.env.example` - Change PORT 8080 → 8180
- [ ] Update `olorin-cv/cvplus/frontend/.env.example` - Update VITE_API_BASE_URL to port 8180
- [ ] Test: `cd olorin-cv/cvplus/frontend && npm run dev`
- [ ] Test: `cd olorin-cv/cvplus/python-backend && poetry run uvicorn app.main:app --port 8180`

### Phase 2: Olorin Media
- [ ] Update `olorin-media/bayit-plus/web/vite.config.js` - Change port 3000 → 3200
- [ ] Update `olorin-media/israeli-radio-manager/frontend/vite.config.ts` - Change port 3001 → 3201
- [ ] Update proxy target in israeli-radio vite config - Backend port 8001 → 8201 (if needed)
- [ ] Test: `cd olorin-media/bayit-plus/web && npm run dev`
- [ ] Test: `cd olorin-media/israeli-radio-manager/frontend && npm run dev`

### Phase 3: Olorin Portals
- [ ] Update `olorin-portals/packages/portal-fraud/package.json` - Change PORT 3001 → 3301
- [ ] Update `olorin-portals/packages/portal-streaming/package.json` - Change PORT 3002 → 3302
- [ ] Update `olorin-portals/packages/portal-radio/package.json` - Change PORT 3003 → 3303
- [ ] Update `olorin-portals/packages/portal-omen/package.json` - Change PORT 3004 → 3304
- [ ] Update `olorin-portals/packages/portal-main/package.json` - Change PORT 3005 → 3305
- [ ] Test each portal individually

### Phase 4: Docker Compose
- [ ] Update `docker-compose.yml` - PORTAL_PORT default 8080 → 8080 (no change, document)
- [ ] Document that containerized deployments use different ports than local dev
- [ ] Add docker-compose override example for local development

### Phase 5: Documentation Updates
- [ ] Update root `CLAUDE.md` with new port assignments
- [ ] Update each project's `CLAUDE.md` or README with correct ports
- [ ] Create `PORT_REFERENCE.md` in root documenting all ports
- [ ] Update any startup scripts or npm scripts with new ports

---

## Testing Matrix

After implementing port changes, verify all combinations:

| Test Scenario | Services Running | Expected Outcome |
|---------------|------------------|------------------|
| Full Fraud Stack | Fraud Backend (8090) + All 10 Fraud Frontend Services (3000-3009) | ✅ All accessible |
| Full CVPlus Stack | CVPlus Backend (8180) + CVPlus Frontend (3100) | ✅ All accessible |
| Full Bayit+ Stack | Bayit+ Backend (8000) + Bayit+ Web (3200) | ✅ All accessible |
| Full Radio Stack | Radio Backend (8001) + Radio Frontend (3201) | ✅ All accessible |
| All Portals | 5 Portal services (3301-3305) | ✅ All accessible |
| Maximum Load Test | All services simultaneously | ✅ No port conflicts |
| Docker Compose | All containerized services | ✅ No host port conflicts |

---

## Configuration Files to Update

### Immediate Priority (Conflicts)

1. **olorin-cv/cvplus/frontend/vite.config.ts**
   ```typescript
   server: {
     port: 3100, // Changed from 3000
     host: true,
   }
   ```

2. **olorin-cv/cvplus/python-backend/.env.example**
   ```bash
   PORT=8180  # Changed from 8080
   ```

3. **olorin-media/bayit-plus/web/vite.config.js**
   ```javascript
   server: {
     port: 3200, // Changed from 3000
   }
   ```

4. **olorin-media/israeli-radio-manager/frontend/vite.config.ts**
   ```typescript
   server: {
     port: 3201, // Changed from 3001
   }
   ```

5. **All Portal package.json files** - Update PORT environment variable:
   - `portal-fraud`: PORT=3301 (was 3001)
   - `portal-streaming`: PORT=3302 (was 3002)
   - `portal-radio`: PORT=3303 (was 3003)
   - `portal-omen`: PORT=3304 (was 3004)
   - `portal-main`: PORT=3305 (was 3005)

---

## Environment Variable Updates

### .env.example Templates to Update

**olorin-cv/cvplus/frontend/.env.example:**
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8180/cvplus-dev/us-central1  # Changed from 8080
VITE_WS_BASE_URL=ws://localhost:8180  # Changed from 8080
```

**Any cross-service references need updating:**
- Check for hardcoded port references in API calls
- Update CORS configurations to include new ports
- Update proxy configurations

---

## Automation Script (Optional)

Create `scripts/update-ports.sh`:

```bash
#!/bin/bash
# Automated port update script

echo "🔧 Updating Olorin Ecosystem Ports..."

# CVPlus Frontend
sed -i '' 's/port: 3000/port: 3100/g' olorin-cv/cvplus/frontend/vite.config.ts

# CVPlus Backend
sed -i '' 's/PORT=8080/PORT=8180/g' olorin-cv/cvplus/python-backend/.env.example

# Bayit+ Web
sed -i '' 's/port: 3000/port: 3200/g' olorin-media/bayit-plus/web/vite.config.js

# Israeli Radio
sed -i '' 's/port: 3001/port: 3201/g' olorin-media/israeli-radio-manager/frontend/vite.config.ts

# Portals
sed -i '' 's/PORT=3001/PORT=3301/g' olorin-portals/packages/portal-fraud/package.json
sed -i '' 's/PORT=3002/PORT=3302/g' olorin-portals/packages/portal-streaming/package.json
sed -i '' 's/PORT=3003/PORT=3303/g' olorin-portals/packages/portal-radio/package.json
sed -i '' 's/PORT=3004/PORT=3304/g' olorin-portals/packages/portal-omen/package.json
sed -i '' 's/PORT=3005/PORT=3305/g' olorin-portals/packages/portal-main/package.json

echo "✅ Port updates complete. Please review changes and test each service."
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing bookmarks/shortcuts | Low | Document new URLs, provide redirect script |
| CI/CD pipeline failures | Medium | Update all pipeline configs with new ports |
| Third-party integrations broken | Low | Most use environment variables, update .env files |
| Developer confusion | Medium | Clear communication, update all documentation |
| Docker networking issues | Low | Use host networking for local dev, bridge for production |

---

## Next Steps

1. **Immediate:** Share this report with development team
2. **Planning:** Schedule port migration (low-impact maintenance window)
3. **Implementation:** Follow checklist above, one phase at a time
4. **Testing:** Run comprehensive testing matrix
5. **Documentation:** Update all developer documentation
6. **Communication:** Notify all developers of new port assignments

---

## Appendix: Quick Port Reference

### Frontend Ports
- **3000-3099:** Olorin Fraud Detection
- **3100-3199:** Olorin CV (CVPlus)
- **3200-3299:** Olorin Media
- **3300-3399:** Olorin Portals

### Backend Ports
- **5001:** Firebase Functions (Local)
- **8000:** Bayit+ Backend
- **8001:** Israeli Radio Backend
- **8080:** Web Portal (Docker)
- **8090:** Fraud Detection Backend
- **8180:** CVPlus Python Backend

### Infrastructure Ports
- **5432:** PostgreSQL
- **6379:** Redis
- **80/443:** Nginx Proxy

---

**Report End**
