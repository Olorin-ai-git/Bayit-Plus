# Troubleshooting Guide

**Last Updated:** 2026-01-30

This guide helps diagnose and resolve common issues across the Bayit+ platform (backend, web, mobile, tvOS).

---

## Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

- [ ] **Server is running** - Backend on port 8000
- [ ] **Database is connected** - MongoDB Atlas reachable
- [ ] **Environment variables set** - Check `.env` file
- [ ] **Secrets configured** - Google Cloud Secret Manager
- [ ] **Dependencies installed** - `poetry install` / `npm install`
- [ ] **Correct Node/Python version** - Node 18+, Python 3.11
- [ ] **Firewall allows connections** - Check network rules
- [ ] **Check logs** - Backend logs, browser console, device logs

---

## Backend Issues

### Issue: Server Won't Start

**Symptoms:**
- `poetry run uvicorn app.main:app --reload` fails
- Error: "Address already in use"
- Error: "Cannot connect to MongoDB"

**Causes & Solutions:**

**1. Port 8000 already in use:**

::: v-pre
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use different port (not recommended)
uvicorn app.main:app --port 8001
```
:::

**2. MongoDB connection failure:**

```bash
# Check MongoDB URI in .env
cat backend/.env | grep MONGODB_URI

# Test connection
mongosh "mongodb+srv://..." --eval "db.stats()"

# Check network access in MongoDB Atlas
# https://cloud.mongodb.com → Network Access
```

**3. Missing dependencies:**

```bash
cd backend
poetry install
poetry show  # Verify packages installed
```

---

### Issue: Import Errors

**Symptoms:**
- `ModuleNotFoundError: No module named 'app'`
- `ImportError: cannot import name 'X' from 'Y'`

**Solutions:**

**1. Python path issue:**

```bash
# Run from project root
cd /path/to/bayit-plus
poetry run uvicorn app.main:app --reload

# Not from backend/ directory
```

**2. Circular imports:**

Check for circular dependencies:
```python
# ❌ BAD - Circular
# file_a.py
from file_b import X

# file_b.py
from file_a import Y

# ✅ GOOD - Move shared code to utils
# utils.py
class Shared: pass

# file_a.py
from utils import Shared

# file_b.py
from utils import Shared
```

**3. Missing `__init__.py`:**

Ensure all directories have `__init__.py`:
```bash
find backend/app -type d -exec touch {}/__init__.py \;
```

---

### Issue: Database Queries Failing

**Symptoms:**
- Error: "Collection was not initialized"
- Error: "Document not found"
- Slow queries

**Solutions:**

**1. Collections not initialized:**

```python
# Ensure init_beanie() called in startup
from app.core.database import connect_to_mongo

await connect_to_mongo()  # Initializes all collections
```

**2. Index missing:**

```bash
# Check indexes
mongosh "mongodb+srv://..." --eval "db.content.getIndexes()"

# Create missing index
mongosh "mongodb+srv://..." --eval 'db.content.createIndex({title: "text"})'
```

**3. Query optimization:**

```python
# ❌ SLOW - No index
await Content.find(Content.title == "Movie").to_list()

# ✅ FAST - Use indexed field
await Content.find(Content.section_ids.in_(["movies"])).to_list()

# ✅ FASTER - Limit results
await Content.find(Content.section_ids.in_(["movies"])).limit(20).to_list()
```

---

### Issue: Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- Token expired messages
- Login fails

**Solutions:**

**1. Check JWT configuration:**

```bash
# Verify SECRET_KEY set
echo $SECRET_KEY
# Should output a long random string

# Check token expiration
cat backend/.env | grep JWT_EXPIRY_HOURS
```

**2. Token format:**

::: v-pre
```bash
# Token should be: Bearer <token>
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ WRONG
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
:::

**3. Firebase token issues:**

```bash
# Check Firebase credentials
cat backend/.env | grep FIREBASE_

# Regenerate Firebase service account key if needed
# https://console.firebase.google.com → Project Settings → Service Accounts
```

---

### Issue: API Rate Limiting

**Symptoms:**
- 429 Too Many Requests
- "Rate limit exceeded" errors

**Solutions:**

**1. Check rate limit tier:**

```python
# Check user's rate limit
from app.models.user import User

user = await User.find_one(User.email == "user@example.com")
print(user.role)  # free/beta/premium/admin
```

**2. Implement exponential backoff:**

```python
import asyncio

async def retry_with_backoff(fn, max_retries=3):
    for i in range(max_retries):
        try:
            return await fn()
        except HTTPException as e:
            if e.status_code == 429 and i < max_retries - 1:
                wait = 2 ** i  # 1s, 2s, 4s
                await asyncio.sleep(wait)
            else:
                raise
```

---

## Frontend Issues (Web)

### Issue: API Calls Failing (CORS)

**Symptoms:**
- Console error: "CORS policy blocked"
- Network tab shows preflight OPTIONS failing

**Solutions:**

**1. Check Vite proxy configuration:**

```typescript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

**2. Verify backend CORS settings:**

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**3. Check request headers:**

```typescript
// Ensure Authorization header included
fetch('/api/v1/content', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

### Issue: Components Not Rendering

**Symptoms:**
- Blank screen
- "Cannot read property 'X' of undefined"
- React errors in console

**Solutions:**

**1. Check for null/undefined data:**

```typescript
// ❌ CRASH if data is undefined
const title = data.content.title;

// ✅ SAFE - Optional chaining
const title = data?.content?.title ?? 'Default Title';
```

**2. Verify API response format:**

```typescript
// Check API response structure
console.log('API Response:', data);

// Ensure success field exists
if (data.success) {
  setContent(data.data);
}
```

**3. Check React DevTools:**

Open React DevTools → Components → Find component → Check props and state

---

### Issue: Zustand Store Not Updating

**Symptoms:**
- State changes don't trigger re-renders
- UI doesn't reflect latest data

**Solutions:**

**1. Check store definition:**

```typescript
// ✅ CORRECT - Returns new object
set(state => ({ ...state, credits: newCredits }))

// ❌ WRONG - Mutates state directly
set(state => { state.credits = newCredits; return state; })
```

**2. Use devtools:**

```typescript
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools((set) => ({
    // ... store definition
  }))
);

// Open Redux DevTools to inspect store changes
```

**3. Subscribe to changes:**

```typescript
// Debug store updates
useStore.subscribe((state) => {
  console.log('Store updated:', state);
});
```

---

## Mobile Issues (React Native)

### Issue: Metro Bundler Fails

**Symptoms:**
- "Unable to resolve module"
- "Module not found"
- Build errors

**Solutions:**

**1. Clear caches:**

```bash
cd mobile-app
rm -rf node_modules
rm package-lock.json
npm install

# Clear Metro cache
npm start -- --reset-cache

# Clear iOS build cache
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**2. Check module resolution:**

```typescript
// metro.config.js
module.exports = {
  resolver: {
    extraNodeModules: {
      '@bayit/glass': path.resolve(__dirname, '../shared/components'),
    },
  },
};
```

**3. Restart development server:**

```bash
# Kill Metro
lsof -ti:8081 | xargs kill -9

# Restart
npm start
```

---

### Issue: iOS Build Fails

**Symptoms:**
- Xcode build errors
- CocoaPods errors
- Linker errors

**Solutions:**

**1. Reinstall pods:**

```bash
cd mobile-app/ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

**2. Clean Xcode:**

```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean build
xcodebuild clean -workspace BayitPlus.xcworkspace -scheme BayitPlus
```

**3. Check iOS version:**

```bash
# Ensure deployment target matches
# ios/Podfile
platform :ios, '16.0'

# BayitPlus.xcodeproj → Build Settings → iOS Deployment Target
# Should be 16.0 or higher
```

---

### Issue: Android Build Fails

**Symptoms:**
- Gradle build errors
- "Could not find" dependency errors

**Solutions:**

**1. Clean Gradle:**

```bash
cd mobile-app/android
./gradlew clean
cd ..
```

**2. Fix dependency issues:**

```bash
cd mobile-app/android
./gradlew app:dependencies

# Check for version conflicts
```

**3. Increase memory:**

```properties
# android/gradle.properties
org.gradle.jvmargs=-Xmx4096m
```

---

## tvOS Issues

### Issue: Focus Navigation Not Working

**Symptoms:**
- Cannot navigate with Siri Remote
- Focus stuck on element
- No visual focus indicator

**Solutions:**

**1. Verify focusable components:**

::: v-pre
```typescript
// ✅ CORRECT - Focusable component
<Pressable focusable={true} onPress={handlePress}>
  <Text>Button</Text>
</Pressable>

// ❌ WRONG - Not focusable
<View onPress={handlePress}>
  <Text>Button</Text>
</View>
```
:::

**2. Add focus styles:**

::: v-pre
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonFocused: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ scale: 1.05 }],
  },
});

<Pressable
  style={({ focused }) => [
    styles.button,
    focused && styles.buttonFocused
  ]}
>
```
:::

**3. Use TVFocusGuideView:**

::: v-pre
```typescript
import { TVFocusGuideView } from 'react-native';

<TVFocusGuideView
  autoFocus={true}
  destinations={[buttonRef.current]}
>
  <View>
    {/* Content */}
  </View>
</TVFocusGuideView>
```
:::

---

## AI Features Issues

### Issue: AI Search Not Working

**Symptoms:**
- "Insufficient credits" error
- No search results
- Slow responses

**Solutions:**

**1. Check credit balance:**

```bash
# Get user credits
curl -X GET "http://localhost:8000/api/v1/beta/credits/balance" \
  -H "Authorization: Bearer TOKEN"
```

**2. Check API keys:**

```bash
# Verify Claude/OpenAI API key
gcloud secrets versions access latest --secret="ANTHROPIC_API_KEY"
```

**3. Check rate limits:**

```python
# Increase timeout for AI requests
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(...)
```

---

### Issue: Voice Features Not Working

**Symptoms:**
- TTS not speaking
- STT not recognizing
- Audio playback fails

**Solutions:**

**1. Check ElevenLabs API:**

```bash
# Test ElevenLabs API
curl -X GET "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: YOUR_KEY"
```

**2. Check browser permissions:**

```javascript
// Request microphone permission
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Mic access granted'))
  .catch(err => console.error('Mic access denied:', err));
```

**3. Check audio format:**

```typescript
// Ensure correct audio format for STT
const audioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  format: 'audio/wav',
};
```

---

## Performance Issues

### Issue: Slow API Responses

**Symptoms:**
- Response time > 500ms
- Timeout errors

**Solutions:**

**1. Check query performance:**

```python
# Add explain() to queries
query = Content.find(Content.title == "Movie")
explain = await query.motor_collection.explain()
print(explain['executionStats'])
```

**2. Add indexes:**

```bash
# Create index for frequently queried field
mongosh "mongodb+srv://..." --eval 'db.content.createIndex({section_ids: 1})'
```

**3. Implement caching:**

```python
from functools import lru_cache

@lru_cache(maxsize=100)
async def get_content_cached(content_id: str):
    return await Content.get(content_id)
```

---

### Issue: High Memory Usage

**Symptoms:**
- Backend OOM (Out of Memory)
- Slow performance
- Crashes

**Solutions:**

**1. Limit query results:**

```python
# ❌ BAD - Loads all documents into memory
all_content = await Content.find_all().to_list()

# ✅ GOOD - Paginate
content = await Content.find().limit(100).to_list()
```

**2. Use streaming:**

```python
# Stream large results
async for content in Content.find():
    process(content)
```

**3. Increase memory limits:**

```bash
# Cloud Run
gcloud run services update bayit-plus-backend \
  --memory=4Gi
```

---

## Logging & Debugging

### Enable Debug Logging

**Backend:**

```bash
# Set log level
export LOG_LEVEL=DEBUG

# Or in .env
LOG_LEVEL=DEBUG

# Restart server
poetry run uvicorn app.main:app --reload
```

**Frontend:**

```typescript
// Enable debug logs
localStorage.setItem('debug', 'bayit:*');

// View logs in console
```

### Check Logs

**Backend logs:**

```bash
# Local
tail -f logs/backend.log

# Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=bayit-plus-backend" \
  --limit=50 --format=json
```

**Frontend logs:**

```bash
# Browser console (F12)
# Look for:
# - Network tab (API calls)
# - Console tab (errors)
# - Application tab (storage)
```

### Common Log Messages

| Log Message | Meaning | Action |
|-------------|---------|--------|
| `Connection refused` | Backend not running | Start backend server |
| `Token expired` | JWT expired | Refresh token or re-login |
| `Collection not initialized` | Database setup failed | Check MongoDB connection |
| `Rate limit exceeded` | Too many requests | Implement backoff |
| `Validation error` | Invalid request | Check request format |

---

## Getting Help

### Before Asking for Help

1. **Check this guide** - Common issues covered here
2. **Check logs** - Error messages provide clues
3. **Search documentation** - [docs.bayitplus.com](https://docs.bayitplus.com)
4. **Check GitHub issues** - Similar problems reported
5. **Try minimal reproduction** - Isolate the issue

### Information to Provide

When reporting issues, include:

- **Platform** - Web/iOS/Android/tvOS
- **Environment** - Production/Staging/Local
- **Error message** - Full error text
- **Steps to reproduce** - What you did before error
- **Expected vs actual** - What should happen vs what happened
- **Logs** - Backend logs, console logs
- **Version** - App version, Node version, Python version
- **Request ID** - From `X-Request-ID` or `X-Correlation-ID` header

### Support Channels

- **Email:** support@bayitplus.com
- **Community:** community.bayitplus.com
- **GitHub Issues:** github.com/bayit-plus/issues
- **Slack:** #bayit-plus-support (internal)

---

## Related Documents

- [API Overview](../api/API_OVERVIEW.md)
- [Testing Strategy](../testing/TESTING_STRATEGY.md)
- [Database Schema Reference](../technical/DATABASE_SCHEMA_REFERENCE.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Support Team
**Next Review:** 2026-04-30
