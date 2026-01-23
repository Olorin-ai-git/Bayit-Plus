# Platform Management Skills - Complete Guide

This document lists all Claude skills created for managing Olorin ecosystem platforms.

**Creation Date:** January 23, 2026
**Total Skills Created:** 13 skills
**Location:** `/Users/olorin/.claude/commands/`

---

## Overview

All skills enforce the **MANDATORY requirement** that starting/stopping servers MUST use dedicated bash scripts. These skills provide convenient shortcuts for managing Olorin platforms during development.

---

## Complete Skill List

### 🚀 Ecosystem-Wide Commands (2 skills)

#### `/olorin-start-all`
- **File:** `olorin-start-all.md`
- **Purpose:** Start ALL Olorin ecosystem servers
- **Services:** Fraud Detection, CVPlus, Bayit+, Israeli Radio, Portals
- **Ports:** 3000-3009, 3100, 3200-3201, 3211, 3301-3305, 8000-8001, 8090, 8180
- **Script:** `./scripts/dev-servers-start.sh --all`
- **Options:** `--kill-first`, `--verbose`

#### `/olorin-stop-all`
- **File:** `olorin-stop-all.md`
- **Purpose:** Stop ALL Olorin ecosystem servers
- **Script:** `./scripts/dev-servers-stop.sh --all`
- **Options:** `--force`, `--verbose`

---

### 📺 Bayit+ Commands (4 skills)

#### `/bayit-start`
- **File:** `bayit-start.md`
- **Purpose:** Start Bayit+ streaming platform
- **Services:**
  - Web Frontend (port 3200)
  - Partner Portal (port 3211)
  - Backend API (port 8000)
- **Script:** `./scripts/dev-servers-start.sh --media`
- **URLs:**
  - Web: http://localhost:3200
  - Partner: http://localhost:3211
  - API: http://localhost:8000/docs

#### `/bayit-stop`
- **File:** `bayit-stop.md`
- **Purpose:** Stop Bayit+ streaming platform
- **Script:** `./scripts/dev-servers-stop.sh --media`

#### `/test-bayit`
- **File:** `test-bayit.md`
- **Purpose:** Run comprehensive Bayit+ tests
- **Tests:**
  - Backend: `poetry run pytest --cov`
  - Frontend: `npm test`
  - Integration tests
  - Smoke tests
  - Health checks

#### `/deploy-bayit`
- **File:** `deploy-bayit.md`
- **Purpose:** Deploy Bayit+ to production/staging
- **Uses:** `firebase-deployment-specialist` subagent
- **Features:**
  - Automated git operations
  - Build validation
  - Firebase deployment
  - Smoke tests
  - Rollback on failure

---

### 🔍 Fraud Detection Commands (4 skills)

#### `/fraud-start`
- **File:** `fraud-start.md`
- **Purpose:** Start Olorin Fraud Detection platform
- **Services:**
  - Frontend Microservices (ports 3000-3009)
    - Shell app (3000)
    - Investigation (3001)
    - Agent analytics (3002)
    - RAG intelligence (3003)
    - Visualization (3004)
    - Reporting (3005)
    - Core UI (3006)
  - Backend API (port 8090)
- **Script:** `./scripts/dev-servers-start.sh --fraud`
- **URLs:**
  - Main: http://localhost:3000
  - API: http://localhost:8090/docs

#### `/fraud-stop`
- **File:** `fraud-stop.md`
- **Purpose:** Stop Olorin Fraud Detection platform
- **Script:** `./scripts/dev-servers-stop.sh --fraud`

#### `/test-olorin`
- **File:** `test-olorin.md`
- **Purpose:** Run comprehensive Fraud Detection tests
- **Tests:**
  - Backend: `poetry run pytest --cov` (87%+ coverage required)
  - Frontend microservices: `npm test`
  - AI agent tests
  - Integration tests
  - Health checks
- **Quality Gates:**
  - ✅ 87%+ test coverage REQUIRED
  - ✅ No mocks/stubs in production
  - ✅ All microservices must pass

#### `/deploy-olorin`
- **File:** `deploy-olorin.md`
- **Purpose:** Deploy Fraud Detection to production/staging
- **Uses:** `firebase-deployment-specialist` subagent
- **Requirements:**
  - 87%+ test coverage
  - All 6 microservices build successfully
  - No mocks/stubs in production code

---

### 📄 CVPlus Commands (2 skills)

#### `/cvplus-start`
- **File:** `cvplus-start.md`
- **Purpose:** Start CVPlus CV builder platform
- **Services:**
  - Frontend (port 3100)
  - Backend API (port 8180)
- **Script:** `./scripts/dev-servers-start.sh --cv`
- **URLs:**
  - Web: http://localhost:3100
  - API: http://localhost:8180/docs

#### `/cvplus-stop`
- **File:** `cvplus-stop.md`
- **Purpose:** Stop CVPlus platform
- **Script:** `./scripts/dev-servers-stop.sh --cv`

---

## Usage Examples

### Starting Individual Platforms

```bash
# Start just Bayit+
/bayit-start

# Start just Fraud Detection
/fraud-start

# Start just CVPlus
/cvplus-start
```

### Starting All Platforms

```bash
# Start entire Olorin ecosystem
/olorin-start-all

# With options
/olorin-start-all --kill-first --verbose
```

### Testing

```bash
# Test Bayit+ after starting
/bayit-start
/test-bayit

# Test Fraud Detection
/fraud-start
/test-olorin
```

### Deployment

```bash
# Deploy Bayit+ to production
/deploy-bayit

# Deploy Fraud Detection
/deploy-olorin
```

### Stopping Services

```bash
# Stop individual platform
/bayit-stop
/fraud-stop
/cvplus-stop

# Stop everything
/olorin-stop-all
```

---

## Script Discovery

All skills are backed by dedicated bash scripts. To find available scripts:

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/scripts
./find-script.sh <keyword>

# Examples:
./find-script.sh start      # Find start scripts
./find-script.sh deploy     # Find deployment scripts
./find-script.sh test       # Find test scripts
```

---

## Port Allocation

Complete port mapping for all Olorin platforms:

| Platform | Service | Port | URL |
|----------|---------|------|-----|
| **Fraud Detection** | Shell App | 3000 | http://localhost:3000 |
| | Investigation | 3001 | http://localhost:3001 |
| | Agent Analytics | 3002 | http://localhost:3002 |
| | RAG Intelligence | 3003 | http://localhost:3003 |
| | Visualization | 3004 | http://localhost:3004 |
| | Reporting | 3005 | http://localhost:3005 |
| | Core UI | 3006 | http://localhost:3006 |
| | Backend API | 8090 | http://localhost:8090/docs |
| **CVPlus** | Frontend | 3100 | http://localhost:3100 |
| | Backend API | 8180 | http://localhost:8180/docs |
| **Bayit+** | Web | 3200 | http://localhost:3200 |
| | Partner Portal | 3211 | http://localhost:3211 |
| | Backend API | 8000 | http://localhost:8000/docs |
| **Israeli Radio** | Frontend | 3201 | http://localhost:3201 |
| | Backend API | 8001 | http://localhost:8001/docs |
| **Portals** | Fraud Portal | 3301 | http://localhost:3301 |
| | Streaming Portal | 3302 | http://localhost:3302 |
| | Radio Portal | 3303 | http://localhost:3303 |
| | Omen Portal | 3304 | http://localhost:3304 |
| | Main Portal | 3305 | http://localhost:3305 |

---

## Logs Location

All server logs are stored in:
```
/Users/olorin/Documents/olorin/logs/
```

View logs:
```bash
# Real-time logs
tail -f /Users/olorin/Documents/olorin/logs/dev-servers-*.log

# Backend-specific logs (example for Bayit+)
tail -f /Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/logs/backend.log
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports automatically
/olorin-start-all --kill-first
/bayit-start --kill-first
```

### Force Stop Stubborn Processes
```bash
/olorin-stop-all --force
/bayit-stop --force
```

### Check Service Health
```bash
# Backend health checks
curl http://localhost:8000/health    # Bayit+
curl http://localhost:8090/health    # Fraud Detection
curl http://localhost:8180/health    # CVPlus
```

### View Verbose Logs
```bash
/olorin-start-all --verbose
/bayit-start --verbose
```

---

## Integration with CLAUDE.md

These skills enforce the **project-level CLAUDE.md requirement**:

> **ABSOLUTE REQUIREMENT**: Starting and stopping backend servers and local development servers MUST ALWAYS be done using dedicated bash scripts. **NEVER** start/stop servers manually or using direct commands.

All skills delegate to the proper scripts:
- ✅ Use ecosystem-wide scripts: `./scripts/dev-servers-start.sh`, `./scripts/dev-servers-stop.sh`
- ✅ Follow script discovery: `./backend/scripts/find-script.sh`
- ✅ Proper error handling and logging
- ✅ Port conflict resolution
- ✅ Graceful shutdown

---

## Commands Index

All skills have been registered in the global commands index:
```
/Users/olorin/.claude/commands/COMMANDS-INDEX.md
```

Total commands: **90 commands** (33 root-level + 9 SpecKit + 15 workflows + 33 tools)

---

## Next Steps

1. **Try the skills**: Start using `/bayit-start`, `/fraud-start`, etc.
2. **Combine skills**: Start platforms, run tests, deploy
3. **Create more**: Add skills for other Olorin platforms (Israeli Radio, Portals, Omen)
4. **Enhance**: Add platform-specific utilities as needed

---

**Last Updated:** January 23, 2026
