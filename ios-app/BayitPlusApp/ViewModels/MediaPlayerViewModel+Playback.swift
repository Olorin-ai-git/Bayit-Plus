import AVFoundation
import BayitMedia
import Foundation

// MARK: - Playback Control, Quality, Cleanup

extension MediaPlayerViewModel {
    /// Manually sync current playback state to widgets.
    /// Call this after toggling play/pause from UI controls.
    @MainActor
    func syncPlaybackState() async {
        #if os(iOS)
            await syncToWidgets()
        #endif
    }

    /// Switch stream quality and persist preference.
    @MainActor
    func switchQuality(_ quality: String) async {
        guard quality != currentQuality else { return }
        let currentPos = player.currentTime
        currentQuality = quality
        preferences.preferredQuality = quality

        do {
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: quality
            )
            guard let urlStr = stream.url, let url = URL(string: urlStr) else { return }

            let mediaType = mapContentType(contentType)
            player.load(url: url, contentType: mediaType)
            player.play()
            await player.seek(to: currentPos)

            // Sync quality change to widgets
            #if os(iOS)
                await syncToWidgets()
            #endif
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Stop playback and save final progress.
    @MainActor
    func cleanup() async {
        await progressTracker.stopTracking()
        player.stop()
        #if os(iOS)
            await widgetBridge.clearNowPlaying()
        #endif
    }

    func mapContentType(_ type: ContentType) -> MediaContentType {
        switch type {
        case .live, .liveTV: return .liveTV
        case .movie, .series, .episode: return .vod
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        case .youtubeVOD: return .youtubeVOD
        case .youtubeLive: return .youtubeLive
        }
    }

    #if os(iOS)
        /// Sync current playback state to widgets immediately.
        @MainActor
        func syncToWidgets() async {
            guard let title = title else { return }
            await widgetBridge.syncNow(
                contentID: contentId,
                contentType: contentType,
                title: title,
                subtitle: subtitle,
                artworkURL: artworkURL
            )
        }
    #endif
}
