# Olorin CLI - Quick Start Guide

**Version:** 1.0.0 (Phase 1 - Bash Router)
**Status:** ✅ Production Ready

---

## Installation

The CLI is already installed! No setup needed.

```bash
# Verify installation
npm run olorin -- --version
```

**Expected output:**
```
Olorin CLI v1.0.0 (Phase 1 - Bash Router)
Platform: Bayit+ Media
```

---

## First Steps

### 1. Health Check (Recommended)

Validate your environment is ready:

```bash
npm run olorin:health
```

**What it checks:**
- ✓ Git repository
- ✓ Node.js ≥20
- ✓ npm, Turbo, Python, Poetry
- ✓ Project structure
- ✓ Environment variables
- ✓ Dependencies installed
- ✓ .claude integration

**If any checks fail:**
```bash
# Auto-fix common issues (Phase 2)
npm run olorin -- health --fix
```

### 2. Check Platform Status

See what's currently running:

```bash
npm run olorin:status
```

**Shows:**
- Backend API status (port 8090)
- Web app status (port 3200)
- Mobile app status (port 19006)
- TV app status (port 3201)
- Partner portal status (port 3202)
- Git branch and status
- Tool versions (Node.js, Poetry, Turbo)

### 3. Start Development Environment

```bash
# Start all Bayit+ services
npm run olorin -- start bayit

# OR start individual services
npm run olorin -- start backend
npm run olorin -- start web
npm run olorin -- start mobile
```

### 4. Stop Services When Done

```bash
npm run olorin -- stop
```

---

## Common Commands

### Platform Management

```bash
# Start services
npm run olorin -- start bayit        # All services
npm run olorin -- start backend      # Backend only
npm run olorin -- start web          # Web only

# Check status
npm run olorin:status                # Full status
npm run olorin -- status backend     # Backend only

# Stop services
npm run olorin -- stop
```

### Build & Test

```bash
# Build
npm run olorin -- build              # All platforms
npm run olorin -- build web          # Web only

# Test
npm run olorin -- test               # All tests
npm run olorin -- test backend       # Backend tests

# Lint
npm run olorin -- lint
```

### Script Discovery

```bash
# Find scripts by keyword
npm run olorin -- script backup
npm run olorin -- script deploy
npm run olorin -- script database

# Platform-specific search
npm run olorin -- script backend backup
npm run olorin -- script web test

# Show recent scripts (last 7 days)
npm run olorin -- script --recent

# List all platforms
npm run olorin -- script --list-platforms
```

### Help

```bash
# Show full help
npm run olorin:help

# OR
npm run olorin -- --help
```

---

## Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc` for shorter commands:

```bash
alias olorin="npm run olorin --"
alias olorin-status="npm run olorin:status"
alias olorin-health="npm run olorin:health"
```

**Then use:**
```bash
olorin start bayit
olorin-status
olorin-health
```

---

## Environment Variables

### Platform Selection

```bash
# Set default platform
export OLORIN_PLATFORM=bayit

# Or override per-command
OLORIN_PLATFORM=backend npm run olorin -- start
```

### Port Configuration

```bash
# Backend port (default: 8090)
export BACKEND_PORT=8091

# Web port (default: 3200)
export WEB_PORT=3201

# Mobile port (default: 19006)
export MOBILE_PORT=19007
```

### .claude Integration

```bash
# Custom .claude directory (default: ~/.claude)
export CLAUDE_DIR=/path/to/.claude
```

---

## Troubleshooting

### Services Won't Start

```bash
# 1. Check status first
npm run olorin:status

# 2. Check for port conflicts
lsof -i :8090  # backend
lsof -i :3200  # web

# 3. Stop conflicting services
npm run olorin -- stop

# 4. Try again
npm run olorin -- start bayit
```

### Health Check Fails

```bash
# Run health check with details
npm run olorin:health

# Check specific issues:
# - Node.js version (requires ≥20)
node --version

# - Dependencies installed
npm install
cd backend && poetry install

# - .claude directory exists
ls -la ~/.claude
```

### "Command not found"

Make sure you're in the project root:
```bash
cd /path/to/bayit-plus
npm run olorin -- --version
```

### Permission Denied

Make scripts executable:
```bash
chmod +x scripts/olorin*.sh
```

---

## Examples

### Daily Workflow

```bash
# Morning - Start work
cd ~/projects/bayit-plus
npm run olorin:health           # Verify environment
npm run olorin -- start bayit   # Start services
npm run olorin:status           # Confirm running

# During work
npm run olorin -- script test   # Find test scripts
npm run olorin -- build web     # Build for testing

# End of day
npm run olorin -- stop          # Stop services
```

### Finding Scripts

```bash
# Find backup scripts
npm run olorin -- script backup

# Find deployment scripts
npm run olorin -- script deploy

# Find database scripts
npm run olorin -- script database

# Show what changed recently
npm run olorin -- script --recent
```

### Multi-Platform Development

```bash
# Start backend
npm run olorin -- start backend

# In another terminal, start web
npm run olorin -- start web

# Check all running services
npm run olorin:status
```

---

## Performance

All commands are **fast** (< 2 seconds):

| Command | Typical Time |
|---------|--------------|
| `--help` | < 0.1s |
| `status` | < 0.5s |
| `health` | < 2s |
| `start` | Same as Turbo (0ms overhead) |
| `script` | < 1s |

---

## What's Coming Next

### Phase 2: Advanced Commands (Week 2)
- `olorin agent <name>` - Invoke Claude agents
- `olorin skill <name>` - Execute skills
- `olorin deploy <target>` - Deploy to production
- `olorin config` - Configuration wizard

### Phase 3-4: Enhanced Features (Week 3-4)
- Bayit+ deep integration
- Comprehensive testing
- Auto-fix for health checks

### Phase 5-6: Multi-Platform (Week 5-6)
- CV Plus support
- Fraud Detection support
- Portals support

---

## Support

### Documentation
- **Full Implementation:** `docs/cli/PHASE_1_IMPLEMENTATION.md`
- **Scripts README:** `scripts/README.md`
- **Help System:** `npm run olorin:help`

### Questions?
- Check `npm run olorin:help` first
- Run `npm run olorin:health` for diagnostics
- See troubleshooting section above

---

**🎉 You're ready to use the Olorin CLI!**

Start with: `npm run olorin:health`
