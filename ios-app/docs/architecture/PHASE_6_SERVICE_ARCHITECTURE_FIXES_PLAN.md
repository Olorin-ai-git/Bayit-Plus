# Phase 6: Service & Architecture Fixes - Implementation Plan

## 6.1 CarPlay share host app's RepositoryProvider [CRITICAL]

**Problem:** CarPlaySceneDelegate creates its own APIClient, WebSocketManager, RepositoryProvider, and MediaPlayer duplicates.
**Solution:** Add static properties to AppDelegate to expose the host app's shared instances. CarPlaySceneDelegate reads from AppDelegate instead of creating its own. Keep CarPlayAuthTokenProvider and CarPlayLocationProvider as-is since they are lightweight adapters.

## 6.3 ShabbatModeService lifecycle coordination [MEDIUM]

**Problem:** Polling continues when app enters background, wasting resources.
**Solution:** In `startPolling()`, register for `UIApplication.didEnterBackgroundNotification` and `willEnterForegroundNotification`. Pause polling on background, resume on foreground. Clean up observers in `stopPolling()`.

## 6.4 InteractiveMissionVM timer leak [MEDIUM]

**Problem:** `startCountdown()` creates a `Timer.scheduledTimer` but never stores the reference. If called multiple times, previous timers continue firing.
**Solution:** Store the timer as `private var countdownTimer: Timer?`. Invalidate existing timer before creating a new one. Invalidate in `cleanup()`.

## 6.5 ARFaceCaptureSession cache CIContext [MEDIUM]

**Problem:** `CIContext()` is created inline in `captureTextureFromFrame()`, potentially called per-frame.
**Solution:** Store as `private let ciContext = CIContext()` at the instance level.

## 6.6 WakeWordService set audio category once [MEDIUM]

**Problem:** `configureAudioSession()` is called every time `startListening()` runs, including automatic re-entry after recognition errors.
**Solution:** Add `private var audioSessionConfigured = false` flag. Skip configuration if already set. Reset on `stopListening()` only when not going to restart.

## 6.7 Cap NavigationCoordinator breadcrumbs [MEDIUM]

**Problem:** `breadcrumbTrails` can grow unbounded per tab.
**Solution:** In `pushToCurrentTab()`, after appending, check if the trail exceeds 20 entries and trim from the front.

## 6.9 DownloadManager remove double Task [LOW]

**Problem:** `downloadAll()` wraps `Task { @MainActor in }` inside a method already marked `@MainActor`.
**Solution:** Remove the inner Task wrapper and call the loop directly.
