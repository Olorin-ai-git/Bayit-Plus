# Bayit+ Performance Findings

**Date:** 2026-03-16
**Screens investigated:** Home, VOD, Search
**Platforms:** Android, iOS, Web + Backend

## Summary

All three frontend platforms achieve meaningful parallelism on Home and VOD, but each has at least one sequential gate that adds latency before the screen becomes interactive. The backend has the most severe issues: featured content triggers an N+1 query loop on every cold request, movies and series use a double-scan anti-pattern, and the search cache is process-local and therefore ineffective in a multi-instance Cloud Run deployment.

## Frontend Findings

### Android

| Screen | Pattern                           | Parallel? | Known Bottleneck                                                         |
| ------ | --------------------------------- | --------- | ------------------------------------------------------------------------ |
| Home   | 13 `launchSection {}` coroutines  | Yes       | `loadCreditBadgeData()` fetches subscription then credits sequentially   |
| VOD    | 3 parallel `launch` blocks        | Yes       | `loadAllContent()` pagination is sequential (typically 1 page, low risk) |
| Search | 500ms debounce, two parallel jobs | Yes       | Debounce window adds perceived latency on fast typists                   |

**Key files:** `HomeViewModel.kt`, `HomeViewModel+Content.kt`, `VodViewModel.kt`, `VodViewModel+Loading.kt`, `SearchViewModel.kt`

**Notes:**

- The `launchSection {}` pattern on Home is well-structured. All 13 sections fire independently and do not block each other.
- `loadCreditBadgeData()` is the single confirmed sequential gate: it `await`s the subscription call before firing the credits call. These two calls are independent and can be parallelised with `async`/`await` or `coroutineScope { async {} }`.
- The 500ms search debounce is higher than the iOS (300ms) and Web (300ms) equivalents. Aligning to 300ms would improve responsiveness without meaningfully increasing backend load.

---

### iOS

| Screen | Pattern                                                    | Parallel? | Known Bottleneck                                                                                  |
| ------ | ---------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Home   | `fetchFeatured()` sequential, then 10 `async let` sections | Mixed     | `fetchFeatured()` (hero + spotlight + categories) blocks all 10 additional sections from starting |
| VOD    | `async let` for categories + content                       | Yes       | Pagination sequential by design; not a bottleneck                                                 |
| Search | 300ms debounce (search) / 150ms (suggestions)              | Yes       | `loadInitialData()` fetches history then trending sequentially before first search                |

**Key files:** `HomeViewModel.swift`, `HomeViewModel+Sections.swift`, `VODViewModel.swift`, `VODViewModel+DataLoading.swift`, `SearchViewModel.swift`

**Notes:**

- `fetchFeatured()` is a sequential `await` chain: hero -> spotlight -> categories. Until all three resolve, none of the 10 parallel `async let` section loads can begin. Decomposing `fetchFeatured()` into three independent `async let` bindings would allow hero content to render while spotlight and categories are still in flight.
- `loadInitialData()` on Search fetches history and trending in series. Since these populate two distinct UI areas (recent searches vs. trending), they can be parallelised safely.

---

### Web

| Screen | Pattern                                                  | Parallel?            | Known Bottleneck                                                                                           |
| ------ | -------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Home   | 5+ independent async calls in `useEffect`                | Effectively parallel | No `useQuery`/`useQueries` — manual `useState+useEffect`; no automatic deduplication or background refetch |
| VOD    | `Promise.all([movies, series])` + independent categories | Yes                  | None identified                                                                                            |
| Search | 300ms debounce, single endpoint                          | Yes                  | None identified                                                                                            |

**Key files:** `HomePage.tsx`, `VODPage.tsx`, `SearchPage.tsx`

**Notes:**

- Web Home achieves parallelism by firing independent async functions without `await` chaining. This works correctly but bypasses TanStack Query's request deduplication, caching, and background-refetch capabilities. Migrating to `useQuery` / `useQueries` would provide automatic stale-while-revalidate behaviour at no performance cost.
- VOD `Promise.all` is correct and idiomatic. No changes needed here.

---

## Backend Findings

| Endpoint      | Has Redis Cache     | Queries per Request                                                                        | Key Issues                                                                                                    |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `featured.py` | No                  | 6 (gather) + N sequential aggregates (N = category count, typically 8-16)                  | N+1 loop; expensive `$regex` with `$options: "i"` on every cold request                                       |
| `movies.py`   | No                  | 2 per list call (find+skip+limit, then find+count); 4 sequential stages for related movies | Double-scan anti-pattern; no caching                                                                          |
| `series.py`   | No                  | 2 per list call (same double-scan); episode count loads ALL episodes into memory           | Double-scan; in-memory episode count instead of `$count` aggregation                                          |
| `search.py`   | Yes (process-local) | 1 (cached path), 1+ (cold path)                                                            | Cache is `dict` in process memory — not shared across Cloud Run instances; effectively no cache in production |

**Redis infrastructure note:** `get_redis_client()` exists in `app.core.redis_client` and is already used by `collections.py` and `actors.py`. All backend cache fixes should wire through this existing client — no new infrastructure required.

---

## Confirmed Bottlenecks (Priority Order)

1. **Backend — featured.py N+1 sequential aggregates.** Every cold request to the featured endpoint fires one MongoDB aggregate per category in a `for` loop (8-16 extra queries after the initial 6-query gather). No Redis cache. This is the highest-impact single issue: it affects the first thing every user sees on Home across all platforms.

2. **Backend — search.py process-local cache.** The cache key hits only within one Cloud Run instance. With auto-scaling, most requests are cache misses in production. Replacing with Redis would make the cache effective fleet-wide.

3. **Backend — movies.py and series.py double-scan.** Every paginated list call issues two full collection scans (data + count). At scale this doubles read load on these high-frequency endpoints.

4. **Backend — series.py in-memory episode count.** The series detail endpoint loads the entire episodes array into application memory to count by season. A `$group` + `$count` aggregation would be a constant-memory O(1) operation.

5. **iOS — `fetchFeatured()` sequential gate.** Hero, spotlight, and categories resolve in series before any of the 10 Home sections can start. This delays time-to-first-content by the sum of all three calls rather than the maximum.

6. **Android — `loadCreditBadgeData()` sequential fetch.** Subscription and credits calls are independent but chained. Estimated latency penalty: one full round-trip (~100-300ms depending on network).

7. **Web — Home uses manual `useState+useEffect` instead of `useQuery`.** Not a latency bottleneck today, but removes automatic caching, deduplication, and background refresh that TanStack Query provides for free.

8. **Android — 500ms search debounce.** Higher than iOS and Web (both 300ms). Minor UX inconsistency but worth aligning.

---

## Fix Plan and Implementation Status

| #   | Fix                                                                                                | Commit      | Status |
| --- | -------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 1   | featured.py N+1: parallelize category queries with `asyncio.gather` + Redis cache (TTL: 5 min)     | `2934a8235` | Done   |
| 2   | search.py: replace process-local dict cache with Redis (`search:{query}` key, TTL: 120s)           | `1354b1711` | Done   |
| 3   | movies.py + series.py: replace double-scan with single `$facet` aggregation                        | `4e320f758` | Done   |
| 4   | featured.py: move cache TTL to config; guard Redis `get()` against None client                     | `8e0e87672` | Done   |
| 5   | iOS: run `loadAdditionalSections()` concurrently with `fetchFeatured()` using `async let`          | `3b4d0520f` | Done   |
| 6   | Android: parallelize subscription + credits in `loadCreditBadgeData()` with `coroutineScope/async` | `62a47a8b5` | Done   |
| 7   | Web: migrate Home data-fetching from `useState+useEffect` to `useQueries` (staleTime: 5 min)       | `e5d2547f6` | Done   |
| 8   | Android: reduce search debounce 500ms → 300ms to match iOS and Web                                 | `62a47a8b5` | Done   |

## Expected Impact

| Area                    | Before                                                                    | After                                                                              |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Home (backend)          | 8-16 sequential MongoDB aggregates per cold request (~800-1600ms)         | Single `asyncio.gather` pass + Redis cache warm path (~100-200ms)                  |
| Search (backend)        | Process-local cache — effectively no cache in multi-instance prod         | Redis fleet-wide cache — cache hits effective across all Cloud Run instances       |
| Movies/Series (backend) | Two full collection scans per list call (data + count)                    | Single `$facet` aggregation — halves MongoDB reads on these endpoints              |
| iOS Home                | 10 additional sections blocked until featured API returns                 | Sections start loading concurrently with featured call                             |
| Android Home            | Credit badge: subscription + balance fetched sequentially                 | Credit badge: subscription + balance fetched in parallel (saves ~100-300ms)        |
| Web Home                | Manual `useState+useEffect` — no deduplication, no stale-while-revalidate | `useQueries` with 5-min staleTime — automatic deduplication and background refresh |
| Android Search          | 500ms debounce delay before query fires                                   | 300ms debounce — consistent with iOS and Web                                       |
