# CLAUDE.md - Bayit+ Streaming Platform

**Bayit+ (בית פלוס)** is a premium Jewish streaming platform: Live TV (10+ Israeli channels with dubbing), VOD, Radio, Podcasts, Audiobooks, and Beta 500 AI credits program.

## Platform Rules

**Backend MUST run on port 8000.** Vite proxy, CI/CD, and all docs depend on it: `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

**Firebase Hosting deploys to ALL THREE sites:**

| Site ID | Domain |
|---------|--------|
| `bayit-plus` | bayit.tv |
| `docs-bayit-plus` | docs.bayit.tv |
| `mobile-bayit` | m.bayit.tv |

**No emojis anywhere** (code, comments, logs, commits). Use `@olorin/icons` for all visual indicators.

**Localization**: Use `@bayit/shared-i18n` (Bayit+ apps) or `@olorin/shared-i18n` (ecosystem apps). Add translations to `packages/ui/shared-i18n/locales/`, update all 10 language files. No custom i18n or isolated locale files.

**API calls**: Use centralized `web/src/services/api.js` only. No custom axios instances. The `api` instance returns `response.data` directly (not the full response object).

**Frontend testing**: Run `/webapp-testing` after ANY frontend changes. Implementation is not complete until it passes.

**Backend testing**: Test ALL endpoints with curl before marking complete. Verify status codes, error handling, auth, CORS, and frontend integration.

## Project Structure

```
bayit-plus/
├── backend/              # FastAPI (Python 3.11+, Poetry)
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── models/      # Beanie ODM models (MongoDB)
│   │   ├── services/    # Business logic
│   │   └── core/        # Config, database, security
│   └── scripts/         # Utility scripts
├── web/                 # React (Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # Glass UI components
│   │   ├── services/    # API client (api.js)
│   │   └── stores/      # Zustand state
│   └── vite.config.js   # Proxy to port 8000
├── mobile-app/          # React Native (iOS + Android)
├── tvos-app/            # React Native tvOS (Apple TV)
├── shared/              # Shared components, stores, i18n
└── docs/                # Documentation
```

## Development Commands

```bash
# Backend
cd backend && poetry install && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Web
cd web && npm install && npm start    # Vite on :3000, proxies /api to :8000

# Mobile/tvOS
cd mobile-app && npm run ios          # iOS
cd mobile-app && npm run android      # Android
cd tvos-app && npm run ios            # Apple TV
```

## Reference Docs

- iOS/tvOS upload: `docs/deployment/IOS_TVOS_UPLOAD.md`
- Beta 500 program: `docs/features/BETA_500.md`
- Troubleshooting: `docs/guides/TROUBLESHOOTING_BAYIT.md`
- Secrets management: `docs/deployment/SECRETS_MANAGEMENT.md`
