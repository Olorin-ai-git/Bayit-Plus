# Phase 3: Networking Consolidation - Implementation Plan

## 3.1 Remove duplicate `fetchContinueWatching` from ContentRepository

- Remove `fetchContinueWatching()` from the `ContentRepository` protocol (line 89)
- Remove `fetchContinueWatching()` from `APIContentRepository` implementation (line 262-267)
- Update callers:
  - `SeriesDetailViewModel.swift` line 90: change `contentRepository.fetchContinueWatching()` to use a `MediaRepository` dependency
  - `VODView.swift` line 92: change `repos.content.fetchContinueWatching()` to `repos.media.fetchContinueWatching()`
- HomeViewModel already uses its own `repository` (ContentRepository) -- need to check if it calls the content or media version
  - HomeViewModel line 206: uses `repository.fetchContinueWatching()` -- this needs to be switched to a mediaRepository dependency

## 3.2 Remove duplicate `fetchTrendingRecommendations` from ContentRepository

- Remove `fetchTrendingRecommendations(limit:)` from the `ContentRepository` protocol (line 133)
- Remove `fetchTrendingRecommendations(limit:)` from `APIContentRepository` (line 316-322)
- Note: TrendingRepository.fetchRecommendations returns `[ContentItem]` not `TrendingRecommendationsResponse`
  - The ContentRepository version returns `TrendingRecommendationsResponse` and calls `/api/v1/trending/recommendations`
  - The TrendingRepository version returns `[ContentItem]` and calls `/api/v1/trending/recommendations`
  - These are different return types for the same endpoint -- we need to add the typed version to TrendingRepository
- Update caller: VODView.swift line 101

## 3.3 Migrate WebSocket services to WebSocketManager

For each of the 4 services, replace direct `URLSession.webSocketTask` with injected `WebSocketManager`:

- LiveDubbingWebSocketService
- LiveSubtitlesWebSocketService
- LiveTriviaWebSocketService
- VoiceInteractionService

Each will get `WebSocketManager` as a dependency, use `connect(to:authToken:)`, and receive messages via the `AsyncStream<String>` from `WebSocketConnection.receive()`.

## 3.4 Extract TVLoginRepository from TVLoginView

- Create `TVLoginRepository` protocol with: verifySession, notifyConnection, completeAuthentication
- Create `APITVLoginRepository` implementation using APIClient
- Move response models from TVLoginView to the repository file
- Update TVLoginView to inject via RepositoryProvider

## 3.5 Add re-entry guard to VODView

- Add `@State private var hasLoaded = false`
- Guard at top of `.task` body
