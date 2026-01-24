# Bayit+ Quality Checklist

Quick reference for running quality checks before deployment.

## Quick Quality Check Commands

```bash
# Navigate to web directory from repository root
cd web

# 1. TypeScript Compilation Check
npx tsc --noEmit 2>&1 | tee /tmp/tsc-check.log

# 2. Production Build Test
npm run build

# 3. ESLint Check
npm run lint -- --max-warnings=999

# 4. Console.log Detection (Critical Files)
grep -r "console\.log" src/App.tsx
grep -r "console\.log" src/components/player/*.tsx
grep -r "console\.log" src/components/epg/*.tsx

# 5. className Usage Detection (Critical Paths)
grep -r "className=" src/App.tsx
grep -r "className=" src/components/player/*.tsx
grep -r "className=" src/components/epg/*.tsx
grep -r "className=" src/components/layout/*.tsx

# 6. Forbidden Patterns Detection
grep -r "\(TODO\|FIXME\|STUB\|MOCK\|PLACEHOLDER\)" src/
```

## Critical Success Criteria

| Check | Command | Success Criteria |
|-------|---------|------------------|
| Build Success | `npm run build` | Exit code 0, no errors |
| TypeScript | `npx tsc --noEmit` | Warnings OK, no blocking errors |
| ESLint | `npm run lint` | Production code clean |
| Console.log | `grep console.log src/App.tsx` | 0 matches |
| className in EPG | `grep className src/components/epg/` | 0 matches |
| Syntax Errors | Build succeeds | No syntax errors |

## Quality Score Target

**Minimum Acceptable:** 90/100
**Target Score:** 95/100
**Current Score:** 94/100

## Before Deployment

- [ ] All critical files have 0 console.log
- [ ] Build succeeds without errors
- [ ] ESLint passes for production code
- [ ] No syntax errors in TypeScript
- [ ] Critical paths (player, EPG, App.tsx) are clean
- [ ] Build artifacts generated successfully

## Known Acceptable Warnings

1. TypeScript React Native module resolution (shared components)
2. ESLint console.log in development scripts (check-uploads*.js)
3. className in header components (web-specific styling)
4. Hardcoded URLs in footer components (UI links)

## Report Generation

Generate full quality report:

```bash
# Run comprehensive checks and save to docs/quality-reports/
# See QUALITY_REPORT_2026-01-23.md for template
```

## Contact

**Quality System Engineer:** Claude Sonnet 4.5
**Last Updated:** 2026-01-23
