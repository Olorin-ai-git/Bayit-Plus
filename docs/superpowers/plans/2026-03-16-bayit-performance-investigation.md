# Bayit+ Performance Investigation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify and fix performance bottlenecks causing slow loading on Home, VOD, and Search screens across Android, iOS, and Web.

**Architecture:** Dual-track — frontend profiling (per platform) and backend API profiling run in parallel. Fixes are applied only after bottlenecks are confirmed. Three high-probability fixes are pre-planned: sequential-to-parallel API calls (all platforms), Redis caching on featured/movies/series endpoints (backend).

**Tech Stack:** Android Studio Profiler, Xcode Instruments, Chrome DevTools, cURL, FastAPI/Python (`bayit-content` backend), Redis, Cloud Run

---

## Context

- `bayit-search` Cloud Run service already has `_MIN_INSTANCES: '2'` default in `bayit-search/cloudbuild-search.yaml` — cold starts are NOT a probable cause
- Backend services: Home → `backend/app/api/routes/content/featured.py`, VOD → `movies.py` + `series.py`, Search → `search.py`
- Frontend: lazy loading (`LazyColumn`/`LazyRow` on Android, `LazyVStack`/`LazyHGrid` on iOS, `React.lazy()` on Web) already in place
- The root cause is unknown — this plan profiles first, fixes second

---

## File Map

| File                                             | Action                             | Responsibility                                     |
| ------------------------------------------------ | ---------------------------------- | -------------------------------------------------- |
| `docs/performance/PERFORMANCE_FINDINGS.md`       | Create                             | All profiling findings + before/after measurements |
| `backend/app/api/routes/content/featured.py`     | Investigate → conditionally modify | Home shelf endpoint — add Redis cache if missing   |
| `backend/app/api/routes/content/movies.py`       | Investigate → conditionally modify | VOD movies listing — add Redis cache if missing    |
| `backend/app/api/routes/content/series.py`       | Investigate → conditionally modify | VOD series listing — add Redis cache if missing    |
| Android Home ViewModel (path TBD from profiling) | Investigate → conditionally modify | Parallelize shelf API calls if sequential          |
| iOS Home fetch (path TBD from profiling)         | Investigate → conditionally modify | Parallelize shelf API calls if sequential          |
| Web Home page (path TBD from profiling)          | Investigate → conditionally modify | Convert `useQuery` to `useQueries` if sequential   |

---

## Chunk 1: Frontend Profiling

### Task 1: Profile Android — Home, VOD, Search

- [ ] **Step 1: Launch Android Studio with the android-app project**

```bash
open /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/android-app
```

- [ ] **Step 2: Start the app in Profile mode**

Run → Profile 'app'. Log in and navigate to the Home screen.

- [ ] **Step 3: Record a Network trace for the Home screen**

In the Profiler panel → Network track:

- Clear the timeline, then navigate from a blank state to the Home screen
- Capture: list of `/api/` calls, their start times, end times, durations
- **Key question:** Do the shelf calls start at the same time (parallel) or one-after-another (sequential)?

- [ ] **Step 4: Record a CPU trace for the Home screen**

In the Profiler panel → CPU track → Record → let Home load → Stop:

- Note: top 5 most expensive functions, any Compose recomposition warnings

- [ ] **Step 5: Repeat Steps 3–4 for the VOD screen**

Navigate to the VOD library. Record network waterfall and CPU.

- [ ] **Step 6: Repeat Steps 3–4 for the Search screen**

Type a query. Record from keystroke to results appearing.

- [ ] **Step 7: Write Android findings to scratch file**

```bash
cat > /tmp/android-profiling-notes.txt << 'EOF'
Android Profiling Notes
=======================
Home:
  - Total load time: ___ms
  - API calls: ___ (sequential / parallel)
  - Slowest call: ___ (___ms)
  - Recomposition warnings: yes / no

VOD:
  - Total load time: ___ms
  - API calls: ___ (sequential / parallel)
  - Slowest call: ___ (___ms)

Search:
  - Time from keystroke to results: ___ms
  - API calls: ___
  - Slowest call: ___ (___ms)
EOF
```

---

### Task 2: Profile iOS — Home, VOD, Search

- [ ] **Step 1: Open Xcode and launch Instruments**

```bash
open /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app/BayitPlusApp.xcodeproj
```

Then: Product → Profile (Cmd+I) → Select "Network" template.

- [ ] **Step 2: Profile the Home screen with Network Instruments**

- Run the app in Instruments
- Log in and navigate to Home
- Capture: all URLSession calls, start times, durations
- **Key question:** Are calls fired in parallel (same start time) or sequential (waterfall)?

- [ ] **Step 3: Profile Home with Time Profiler**

Product → Profile → Time Profiler → navigate to Home:

- Capture: main thread hangs > 16ms, most expensive functions

- [ ] **Step 4: Repeat Steps 2–3 for VOD and Search**

- [ ] **Step 5: Write iOS findings to scratch file**

```bash
cat > /tmp/ios-profiling-notes.txt << 'EOF'
iOS Profiling Notes
===================
Home:
  - Total load time: ___ms
  - URLSession calls: ___ (sequential / parallel)
  - Slowest call: ___ (___ms)
  - Main thread hangs: yes / no

VOD:
  - Total load time: ___ms
  - Calls: ___ (sequential / parallel)

Search:
  - Time to results: ___ms
EOF
```

---

### Task 3: Profile Web — Home, VOD, Search

- [ ] **Step 1: Start the web app**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web && npm start
```

Open http://localhost:3000 in Chrome.

- [ ] **Step 2: Profile Home page network**

DevTools → Network tab → check "Disable cache" → navigate to Home after login:

- Filter by `/api/` — list all calls, their start/end times
- **Key question:** Are React Query calls parallel or sequential?
- Capture: time to first response, time to last response, total page interactive time

- [ ] **Step 3: Profile Home page performance**

DevTools → Performance tab → Record → navigate to Home → Stop:

- Capture: Time to Interactive, Largest Contentful Paint, any long tasks > 50ms

- [ ] **Step 4: Check bundle chunk sizes for the three routes**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web && npm run build 2>&1 | grep -iE "(home|vod|search|chunk)" | head -20
```

- [ ] **Step 5: Repeat Steps 2–3 for VOD and Search pages**

- [ ] **Step 6: Write Web findings to scratch file**

```bash
cat > /tmp/web-profiling-notes.txt << 'EOF'
Web Profiling Notes
===================
Home:
  - API calls: ___ (sequential / parallel)
  - Time to Interactive: ___ms
  - LCP: ___ms
  - Chunk size: ___KB

VOD:
  - API calls: ___ (sequential / parallel)
  - Time to Interactive: ___ms

Search:
  - Time to results: ___ms
  - Chunk size: ___KB
EOF
```

---

## Chunk 2: Backend Profiling

### Task 4: Measure API response times

- [ ] **Step 1: Start the backend**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- [ ] **Step 2: Get a test auth token**

Check `docs/guides/TROUBLESHOOTING_BAYIT.md` for how to get a valid JWT for local testing. Set it as `TOKEN` in your shell:

```bash
TOKEN="<paste token here>"
```

- [ ] **Step 3: Measure the Home (featured) endpoint — 5 runs**

```bash
for i in 1 2 3 4 5; do
  curl -w "run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/content/featured
done
```

Note min/max/average. Slow = >500ms average.

- [ ] **Step 4: Measure VOD endpoints**

```bash
# Movies
for i in 1 2 3; do
  curl -w "movies run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8000/api/v1/content/movies?page=1&limit=20"
done

# Series
for i in 1 2 3; do
  curl -w "series run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8000/api/v1/content/series?page=1&limit=20"
done
```

- [ ] **Step 5: Measure the Search endpoint**

```bash
for i in 1 2 3; do
  curl -w "search run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8000/api/v1/search?q=news&limit=20"
done
```

- [ ] **Step 6: Check which endpoints already have Redis caching**

```bash
grep -n "redis\|cache\|ttl\|TTL\|get_cache\|set_cache" \
  backend/app/api/routes/content/featured.py \
  backend/app/api/routes/content/movies.py \
  backend/app/api/routes/content/series.py \
  backend/app/api/routes/search.py
```

Note: for any endpoint without caching that is >300ms, it is a fix candidate.

- [ ] **Step 7: Check MongoDB Atlas slow query logs**

Log into MongoDB Atlas → your cluster → Performance Advisor tab.
Note any queries flagged as slow on `content`, `movies`, or `series` collections.

---

### Task 5: Document all findings

**Files:**

- Create: `docs/performance/PERFORMANCE_FINDINGS.md`

- [ ] **Step 1: Create the findings document from your scratch notes**

```markdown
# Bayit+ Performance Findings

**Date:** 2026-03-16
**Screens investigated:** Home, VOD, Search
**Platforms:** Android, iOS, Web + Backend

## Frontend Findings

### Android

| Screen | Load Time | API Calls | Sequential/Parallel | Slowest Call |
| ------ | --------- | --------- | ------------------- | ------------ |
| Home   | \_\_\_ms  | \_\_\_    | \_\_\_              | \_\_\_ms     |
| VOD    | \_\_\_ms  | \_\_\_    | \_\_\_              | \_\_\_ms     |
| Search | \_\_\_ms  | \_\_\_    | \_\_\_              | \_\_\_ms     |

### iOS

[same table]

### Web

| Screen | Time to Interactive | API Calls | Sequential/Parallel | Chunk Size |
| ------ | ------------------- | --------- | ------------------- | ---------- |
| Home   | \_\_\_ms            | \_\_\_    | \_\_\_              | \_\_\_KB   |
| VOD    | \_\_\_ms            | \_\_\_    | \_\_\_              | \_\_\_KB   |
| Search | \_\_\_ms            | \_\_\_    | \_\_\_              | \_\_\_KB   |

## Backend Findings

| Endpoint                 | Avg Response Time | Has Redis Cache | DB Queries |
| ------------------------ | ----------------- | --------------- | ---------- |
| /api/v1/content/featured | \_\_\_ms          | Yes/No          | \_\_\_     |
| /api/v1/content/movies   | \_\_\_ms          | Yes/No          | \_\_\_     |
| /api/v1/content/series   | \_\_\_ms          | Yes/No          | \_\_\_     |
| /api/v1/search           | \_\_\_ms          | Yes/No          | \_\_\_     |

## Confirmed Bottlenecks

1. [List each with evidence and platform]

## Fix Plan (Priority Order)

1. [Fix — estimated impact — task reference below]
```

- [ ] **Step 2: Commit the findings document**

```bash
git add docs/performance/PERFORMANCE_FINDINGS.md
git commit -m "docs(performance): add profiling findings for home/vod/search"
```

---

## Chunk 3: Pre-Planned Fixes

> **GATE:** Only execute a task below if the corresponding bottleneck was CONFIRMED in `docs/performance/PERFORMANCE_FINDINGS.md`. Skip tasks where profiling showed no issue.

---

### Task 6: Fix — Parallel API calls on Android Home (if sequential confirmed)

**Files:**

- Modify: Android Home ViewModel (path identified during profiling)

- [ ] **Step 1: Identify the ViewModel**

```bash
find android-app/feature/feature-home -name "*ViewModel*" | head -5
```

- [ ] **Step 2: Locate the sequential shelf calls and write a failing test**

Find the function that fetches Home content. Write a test asserting calls are parallel:

```kotlin
@Test
fun `home content calls execute in parallel not sequentially`() = runTest {
    val callOrder = Collections.synchronizedList(mutableListOf<String>())
    val fakeRepo = object : ContentRepository {
        override suspend fun getFeatured(): List<Content> {
            callOrder.add("featured:start")
            delay(100) // simulate network
            callOrder.add("featured:end")
            return emptyList()
        }
        override suspend fun getMovies(): List<Content> {
            callOrder.add("movies:start")
            delay(100)
            callOrder.add("movies:end")
            return emptyList()
        }
    }
    val vm = HomeViewModel(fakeRepo)
    vm.loadHomeContent()

    // All :start events should appear before any :end event if parallel
    val firstEndIndex = callOrder.indexOfFirst { it.endsWith(":end") }
    val allStartsBefore = callOrder.take(firstEndIndex).all { it.endsWith(":start") }
    assertTrue("Expected parallel execution", allStartsBefore)
}
```

- [ ] **Step 3: Run the test — verify it FAILS**

```bash
cd android-app && ./gradlew :feature:feature-home:test --tests "*.HomeViewModelTest" 2>&1 | tail -10
```

- [ ] **Step 4: Convert sequential calls to parallel using `async { } + awaitAll()`**

```kotlin
// Before (sequential):
val featured = contentRepository.getFeatured()
val movies = contentRepository.getMovies()
val series = contentRepository.getSeries()

// After (parallel):
coroutineScope {
    val featuredDeferred = async { contentRepository.getFeatured() }
    val moviesDeferred = async { contentRepository.getMovies() }
    val seriesDeferred = async { contentRepository.getSeries() }
    val results = awaitAll(featuredDeferred, moviesDeferred, seriesDeferred)
    // update state with results[0], results[1], results[2]
}
```

- [ ] **Step 5: Run test — verify it PASSES**

- [ ] **Step 6: Commit**

```bash
git commit -m "perf(android): parallelize home shelf API calls"
```

---

### Task 7: Fix — Parallel API calls on iOS Home (if sequential confirmed)

**Files:**

- Modify: iOS Home ViewModel/Service (path identified during profiling)

- [ ] **Step 1: Find the file that orchestrates Home fetches**

```bash
grep -rn "await.*fetch\|await.*get\|await.*load" ios-app/BayitPlusApp/Views/Home/ ios-app/BayitPlusApp/ViewModels/ 2>/dev/null | head -20
```

- [ ] **Step 2: Convert sequential `await` chains to `async let`**

```swift
// Before (sequential):
let featured = try await contentService.getFeatured()
let movies = try await contentService.getMovies()
let series = try await contentService.getSeries()

// After (parallel):
async let featured = contentService.getFeatured()
async let movies = contentService.getMovies()
async let series = contentService.getSeries()
let (f, m, s) = try await (featured, movies, series)
```

- [ ] **Step 3: Build**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app
xcodebuild -scheme BayitPlusApp \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  build 2>&1 | tail -5
```

Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(ios): parallelize home shelf API calls with async let"
```

---

### Task 8: Fix — Parallel API calls on Web Home page (if sequential confirmed)

**Files:**

- Modify: Web Home page (path identified during profiling)

- [ ] **Step 1: Find the Home page data fetching**

```bash
grep -rn "useQuery\|useQueries" web/src/pages/ | grep -i home | head -10
```

- [ ] **Step 2: Convert multiple `useQuery` calls to a single `useQueries` call**

```typescript
// Before (each fires independently, no guaranteed parallelism):
const { data: featured } = useQuery({
  queryKey: ["featured"],
  queryFn: api.getFeatured,
});
const { data: movies } = useQuery({
  queryKey: ["movies"],
  queryFn: api.getMovies,
});
const { data: series } = useQuery({
  queryKey: ["series"],
  queryFn: api.getSeries,
});

// After (guaranteed parallel):
const results = useQueries({
  queries: [
    { queryKey: ["featured"], queryFn: api.getFeatured },
    { queryKey: ["movies"], queryFn: api.getMovies },
    { queryKey: ["series"], queryFn: api.getSeries },
  ],
});
const [featuredResult, moviesResult, seriesResult] = results;
const featured = featuredResult.data;
const movies = moviesResult.data;
const series = seriesResult.data;
```

- [ ] **Step 3: Build**

```bash
cd web && npm run build 2>&1 | tail -5
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(web): parallelize home page data fetching with useQueries"
```

---

### Task 9: Fix — Redis cache on featured/movies/series endpoints (if missing cache confirmed)

**Files:**

- Modify: `backend/app/api/routes/content/featured.py`
- Modify: `backend/app/api/routes/content/movies.py`
- Modify: `backend/app/api/routes/content/series.py`

- [ ] **Step 1: Find the existing Redis/cache infrastructure**

```bash
grep -rn "redis\|get_cache\|cache_client\|RedisClient" \
  backend/app/core/ backend/app/services/ | grep -v ".pyc" | head -20
```

Note: the import path, the function/class name, and the pattern used in existing cached endpoints. Do NOT create a new caching implementation.

- [ ] **Step 2: Find an existing cached endpoint to use as a reference**

```bash
grep -rn "cache\|redis" backend/app/api/routes/ | grep -v ".pyc" | head -20
```

Copy the exact caching pattern from an endpoint that already uses it.

- [ ] **Step 3: Write a test for featured endpoint cache behavior**

Find the test file for the featured endpoint (check `backend/tests/`). Add:

```python
@pytest.mark.asyncio
async def test_featured_endpoint_served_from_cache_on_second_call(
    client, auth_headers, mock_redis
):
    # First call — populates cache
    response1 = await client.get("/api/v1/content/featured", headers=auth_headers)
    assert response1.status_code == 200

    # Second call — should come from cache (DB mock should not be called again)
    response2 = await client.get("/api/v1/content/featured", headers=auth_headers)
    assert response2.status_code == 200
    assert response2.json() == response1.json()
```

> Adapt to the actual test fixture patterns used in `backend/tests/`. Check an existing endpoint test for the correct mock setup.

- [ ] **Step 4: Run the test — verify it FAILS**

```bash
cd backend && poetry run pytest tests/ -k "test_featured_endpoint_served_from_cache" -v 2>&1 | tail -10
```

- [ ] **Step 5: Add caching to featured.py using the existing infrastructure**

Follow the pattern from Step 2 exactly. Use:

- Cache key: `"content:featured:v1"`
- TTL: 300 seconds (5 minutes) — content changes infrequently

- [ ] **Step 6: Run the test — verify it PASSES**

- [ ] **Step 7: Apply the same caching pattern to movies.py and series.py**

Use cache keys:

- `"content:movies:v1:page:{page}:limit:{limit}"`
- `"content:series:v1:page:{page}:limit:{limit}"`

- [ ] **Step 8: Verify the cache actually speeds up the endpoint**

```bash
TOKEN="<your-test-token>"

echo "=== Cold (no cache) ==="
for i in 1 2 3; do
  curl -w "run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/content/featured
done

echo "=== Warm (from cache) ==="
for i in 1 2 3; do
  curl -w "run $i: %{time_total}s\n" -s -o /dev/null \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/content/featured
done
```

Expected: warm calls are significantly faster than cold calls.

- [ ] **Step 9: Run full backend test suite**

```bash
cd backend && poetry run pytest tests/ -v 2>&1 | tail -30
```

Expected: all tests pass, coverage >= 87%

- [ ] **Step 10: Commit**

```bash
git add backend/app/api/routes/content/featured.py \
        backend/app/api/routes/content/movies.py \
        backend/app/api/routes/content/series.py
git commit -m "perf(backend): add Redis cache to featured/movies/series endpoints"
```

---

### Task 10: Measure and document improvements

- [ ] **Step 1: Re-run profiling steps from Chunks 1 and 2 on the patched version**

Repeat Tasks 1–4 (same measurements, same screens).

- [ ] **Step 2: Update `docs/performance/PERFORMANCE_FINDINGS.md` with before/after**

Add an "After" column to each table and note the percentage improvement per screen per platform.

- [ ] **Step 3: Commit**

```bash
git add docs/performance/PERFORMANCE_FINDINGS.md
git commit -m "docs(performance): add before/after measurements"
```

---

## Decision Log

| Decision                                                 | Alternatives Considered                     | Reason                                                                                 |
| -------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Profile before fixing                                    | Implement all pre-planned fixes immediately | Lazy loading already exists everywhere; fixes without evidence risk wasted effort      |
| Dual-track profiling (frontend + backend simultaneously) | Frontend-first or backend-first             | Root cause unknown; parallel tracks avoid 2-week serial investigation                  |
| Skip `bayit-search` cold start fix                       | Set minInstances=1                          | Deploy config already has `_MIN_INSTANCES: '2'` — cold starts not applicable           |
| 5-minute Redis TTL on featured/movies/series             | Longer TTL, shorter TTL, no TTL             | Content changes infrequently; 5 min balances freshness vs. performance gain            |
| `useQueries` over multiple `useQuery`                    | `Promise.all` manual fetch                  | `useQueries` is the TanStack Query idiomatic pattern; integrates with existing caching |
