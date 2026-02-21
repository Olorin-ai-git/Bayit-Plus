import AVFoundation
import BayitMedia
import Foundation

// MARK: - Loading & Playback

extension MediaPlayerViewModel {
    /// Load content metadata and stream URL, then begin playback.
    @MainActor
    func load() async {
        isLoading = true
        errorMessage = nil

        #if os(iOS)
            // Offline-first: use locally downloaded asset when available (no network needed).
            if let download = downloadManager?.localDownload(for: contentId),
               let localURL = downloadManager?.playLocalDownload(id: download.id)
            {
                title = download.title
                if let thumbStr = download.thumbnail { artworkURL = URL(string: thumbStr) }
                let mediaType = mapContentType(contentType)
                player.load(url: localURL, contentType: mediaType)
                isLoading = false
                await progressTracker.loadResumePosition()
                initialPosition = progressTracker.initialPosition
                player.play()
                if initialPosition > 0 { await player.seek(to: initialPosition) }
                if mediaType.isSeekable { progressTracker.startTracking() }
                return
            }
        #endif

        do {
            // Resolve stream URL and metadata
            let resolved = try await streamResolver.resolveStream(
                contentId: contentId,
                contentType: contentType
            )

            // Update view model state
            title = resolved.title
            subtitle = resolved.subtitle
            artworkURL = resolved.artworkURL
            currentQuality = resolved.quality
            availableQualities = resolved.availableQualities
            availableSubtitleLanguages = resolved.availableSubtitles

            // Load resume position
            await progressTracker.loadResumePosition()
            initialPosition = progressTracker.initialPosition

            // Load and play
            let mediaType = mapContentType(contentType)
            player.load(url: resolved.url, contentType: mediaType)

            isLoading = false

            // Auto-play after loading
            player.play()

            // Restore saved playback rate
            let savedRate = preferences.preferredPlaybackRate
            if savedRate != 1.0 {
                player.setRate(savedRate)
            }

            // Apply preferred quality if different from resolved
            let savedQuality = preferences.preferredQuality
            if savedQuality != PlayerPreferencesService.Defaults.quality, savedQuality != currentQuality {
                Task { await switchQuality(savedQuality) }
            }

            // Immediately sync playback to widgets
            #if os(iOS)
                await syncToWidgets()
            #endif

            // Seek to resume position if available
            if initialPosition > 0 {
                await player.seek(to: initialPosition)
            }

            // Start periodic progress tracking for seekable content
            if mediaType.isSeekable {
                progressTracker.startTracking()
            }
        } catch let error as StreamResolutionError {
            errorMessage = error.errorDescription
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
}
