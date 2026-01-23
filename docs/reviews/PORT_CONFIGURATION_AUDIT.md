# Port Configuration Audit

**Date:** 2026-01-23
**Status:** 🔴 MISMATCHES FOUND

---

## Executive Summary

Port configuration mismatches found between `olorin/scripts/dev-servers-start.sh` and actual subproject configurations. Critical issue: Bayit+ web is configured to use port 3000, but the orchestration script expects port 3200.

---

## Current Port Allocations (Documented in dev-servers-start.sh)

### Fraud Detection Platform
| Service | Expected Port | Status |
|---------|--------------|--------|
| Backend | 8090 | Not verified (outside Bayit+ scope) |
| Shell | 3000 | Not verified |
| Investigation | 3001 | Not verified |
| Analytics | 3002 | Not verified |
| RAG | 3003 | Not verified |
| Visualization | 3004 | Not verified |
| Reporting | 3005 | Not verified |
| Core UI | 3006 | Not verified |
| Design System | 3007 | Not verified |
| Investigations Mgmt | 3008 | Not verified |
| Financial | 3009 | Not verified |

### CVPlus Platform
| Service | Expected Port | Status |
|---------|--------------|--------|
| Backend | 8180 | Not verified (outside Bayit+ scope) |
| Frontend | 3100 | Not verified |

### Bayit+ Media Platform
| Service | Expected Port | **Actual Port** | Status |
|---------|--------------|-----------------|--------|
| Backend | 8000 | **8000** | ✅ MATCH |
| Web | **3200** | **3000** | ❌ **MISMATCH** |

### Israeli Radio Manager (if exists)
| Service | Expected Port | Actual Port | Status |
|---------|--------------|-------------|--------|
| Backend | 8001 | Unknown | ⚠️ Not verified |
| Frontend | 3201 | Unknown | ⚠️ Not verified |

### Bayit+ Partner Portal
| Service | Expected Port | **Actual Port** | Status |
|---------|--------------|-----------------|--------|
| Frontend | **Not documented** | **3011** | ❌ **MISSING** |

### Olorin Portals
| Service | Expected Port | Status |
|---------|--------------|--------|
| Fraud Portal | 3301 | Not verified (outside Bayit+ scope) |
| Streaming Portal | 3302 | Not verified |
| Station Portal | 3303 | Not verified |
| Omen Portal | 3304 | Not verified |
| Main Portal | 3305 | Not verified |

---

## Critical Findings

### 🔴 CRITICAL: Bayit+ Web Port Mismatch

**Issue:** The orchestration script expects Bayit+ web to run on port 3200, but all actual configurations use port 3000.

**Evidence:**
1. `web/webpack.config.cjs` line 294: `port: 3000`
2. `web/package.json` dev script: `lsof -ti:3000 | xargs kill -9`
3. `backend/.env.example` line 636: `http://localhost:3000` (CORS origins)
4. `olorin/scripts/dev-servers-start.sh` line 270: expects port 3200

**Impact:**
- If dev-servers-start.sh is used, Bayit+ web will attempt to start on port 3200
- CORS configuration in backend expects port 3000
- Port conflict with Fraud Detection services (port 3000 is already allocated to fraud-shell)

### 🔴 CRITICAL: Partner Portal Not Documented

**Issue:** Partner portal uses port 3011 but is not documented in the orchestration scripts.

**Evidence:**
1. `partner-portal/package.json` dev script: `lsof -ti:3011 | xargs kill -9`
2. Not present in `dev-servers-start.sh` port allocation
3. Not present in `dev-servers-stop.sh` FRONTEND_PORTS array

**Impact:**
- Partner portal cannot be started via orchestration script
- Port 3011 will not be cleaned up by stop script
- Potential port conflicts undetected

---

## Recommended Fixes

### Option 1: Update Orchestration Script (RECOMMENDED)

**Rationale:** Bayit+ web configurations are consistent at port 3000. Changing one orchestration script is easier than changing multiple configuration files.

**Changes Required:**

1. **Update `olorin/scripts/dev-servers-start.sh`**
   ```bash
   # Line 270 - Change from:
   start_service "bayit-web" 3200 "$ROOT_DIR/olorin-media/bayit-plus/web" \

   # To:
   start_service "bayit-web" 3000 "$ROOT_DIR/olorin-media/bayit-plus/web" \
   ```

2. **Add Partner Portal support**
   ```bash
   # After bayit-web service start, add:
   start_service "bayit-partner-portal" 3011 "$ROOT_DIR/olorin-media/bayit-plus/partner-portal" \
     "npm run dev" || FAILED_SERVICES+=("bayit-partner-portal")
   ```

3. **Update `olorin/scripts/dev-servers-stop.sh`**
   ```bash
   # Line 46 - Add 3011 to FRONTEND_PORTS:
   FRONTEND_PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3011 3100 3200 3201 3301 3302 3303 3304 3305)
   ```

4. **Update Port Allocation Documentation in Script Headers**
   ```bash
   # In dev-servers-start.sh, update header comment:
   # Port Allocation:
   #   Fraud Detection:  3000-3009 (frontend microservices), 8090 (backend)
   #   CVPlus:           3100 (frontend), 8180 (backend)
   #   Bayit+:           3000 (web), 3011 (partner-portal), 8000 (backend)  # CHANGED
   #   Israeli Radio:    3201 (frontend), 8001 (backend)
   #   Portals:          3301-3305 (fraud, streaming, radio, omen, main)
   ```

**⚠️ CONFLICT ALERT:** This creates a port conflict where both Bayit+ web AND Fraud Detection shell use port 3000!

### Option 2: Resolve Port 3000 Conflict

**Problem:** Both Bayit+ web and Fraud Detection shell cannot use port 3000.

**Solution 1: Move Bayit+ Web to 3200 (Requires Multiple Changes)**
- Update `web/webpack.config.cjs` port to 3200
- Update `web/package.json` dev script to kill port 3200
- Update `backend/.env.example` CORS to include localhost:3200
- Update all developer documentation

**Solution 2: Move Fraud Detection Shell to Different Port (Outside Bayit+ Scope)**
- Requires changes to olorin-fraud project
- Bayit+ team cannot implement this

**RECOMMENDED:** Use Option 2 - Solution 1 if Fraud Detection and Bayit+ need to run simultaneously. Otherwise, keep Bayit+ on 3000 (standard React dev port) and document that fraud-shell and bayit-web cannot run concurrently.

---

## Port Assignment Strategy

### Current Reality
Different projects have organically chosen ports:
- Bayit+ naturally uses 3000 (Webpack/Vite default)
- Partner Portal uses 3011 (likely chosen to avoid conflicts)
- Fraud Detection reserved 3000-3009 block

### Recommended Strategy

**Allocate clear port ranges per platform:**

| Platform | Frontend Range | Backend Range |
|----------|---------------|---------------|
| Fraud Detection | 3000-3019 | 8090-8099 |
| CVPlus | 3100-3119 | 8180-8189 |
| **Bayit+ Media** | **3200-3219** | **8000-8009** |
| Israeli Radio | 3220-3239 | 8010-8019 |
| Portals | 3300-3319 | 8300-8319 |

**Bayit+ Port Assignments:**
- 3200: Web frontend ✅
- 3201: TV app dev server (if needed)
- 3202: Mobile app dev server (if needed)
- 3203: tvOS app dev server (if needed)
- 3204: WebOS app dev server (if needed)
- 3205: Tizen app dev server (if needed)
- 3211: Partner portal ✅
- 3212-3219: Reserved for future services
- 8000: Main backend ✅
- 8001-8009: Reserved for microservices

**Benefits:**
- No port conflicts between platforms
- Easy to identify which service by port number
- Room for growth in each platform
- Standard port ranges documented

---

## Implementation Plan

### Phase 1: Document Current State ✅
- [x] Audit all Bayit+ port configurations
- [x] Document mismatches
- [x] Create this report

### Phase 2: Fix Bayit+ Configuration (RECOMMENDED)

1. **Update Bayit+ Web to Port 3200**
   ```bash
   # web/webpack.config.cjs
   port: 3200  # Change from 3000

   # web/package.json
   "dev": "lsof -ti:3200 | xargs kill -9 2>/dev/null || true; webpack serve --mode development --config webpack.config.cjs"
   ```

2. **Update Partner Portal to Port 3211**
   ```bash
   # partner-portal/webpack.config.cjs (create if needed)
   port: 3211  # Change from 3011

   # partner-portal/package.json
   "dev": "lsof -ti:3211 | xargs kill -9 2>/dev/null || true; webpack serve --mode development --config webpack.config.cjs"
   ```

3. **Update Backend CORS Configuration**
   ```bash
   # backend/.env.example
   # For development: http://localhost:3200,http://localhost:8000
   BACKEND_CORS_ORIGINS=http://localhost:3200,http://localhost:3211,http://localhost:8000
   ```

4. **Update Orchestration Scripts**
   - Update `olorin/scripts/dev-servers-start.sh` to use 3200 and 3211
   - Update `olorin/scripts/dev-servers-stop.sh` to include 3211
   - Update documentation in script headers

### Phase 3: Update Documentation

1. Update `README.md` with correct ports
2. Update `docs/deployment/DEPLOYMENT.md` with port information
3. Update `.env.example` files with correct CORS origins
4. Add port reference to developer documentation

---

## Testing Checklist

After implementing fixes:

- [ ] Start Bayit+ web with `npm run dev` - verify runs on correct port
- [ ] Start Partner Portal with `npm run dev` - verify runs on correct port
- [ ] Start Backend with `poetry run uvicorn app.main:app --reload` - verify runs on 8000
- [ ] Test CORS: Make API call from web frontend to backend
- [ ] Test CORS: Make API call from partner portal to backend
- [ ] Start all services with `olorin/scripts/dev-servers-start.sh --media`
- [ ] Verify no port conflicts
- [ ] Stop all services with `olorin/scripts/dev-servers-stop.sh`
- [ ] Verify all processes stopped

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| CORS failures after port change | HIGH | Update .env files before deployment |
| Developer environment breaks | MEDIUM | Communicate changes, update docs |
| Port conflicts in development | LOW | Use consistent port ranges |
| Orchestration script fails | LOW | Test thoroughly before merge |

---

## Approval Required

This audit identifies critical configuration mismatches that require coordinated fixes across:
- Bayit+ subproject configurations (webpack, package.json)
- Backend CORS configuration
- Orchestration scripts in olorin/scripts
- Documentation

**Recommended Approach:**
1. Get approval for port range strategy
2. Implement Phase 2 changes in Bayit+ first
3. Coordinate with olorin/scripts maintainer for orchestration updates
4. Update all documentation
5. Test end-to-end

**Decision Needed:**
- Option A: Keep Bayit+ on 3000, accept conflict with Fraud Detection (simpler)
- Option B: Move Bayit+ to 3200 range (cleaner, requires more changes) ← **RECOMMENDED**

---

## Next Steps

1. **User Decision:** Choose Option A or Option B
2. **Implementation:** Apply fixes per chosen option
3. **Testing:** Run full testing checklist
4. **Documentation:** Update all references
5. **Communication:** Notify team of port changes

---

**Audit Completed By:** Claude Code Multi-Agent System
**Review Status:** Awaiting user decision on port strategy
