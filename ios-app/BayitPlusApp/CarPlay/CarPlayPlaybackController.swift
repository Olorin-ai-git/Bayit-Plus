import BayitCore
import BayitMedia
import CarPlay
import Foundation

/// Bridges CarPlay UI interactions to the existing audio playback stack.
///
/// Uses `StreamResolver` for content URL resolution, `NowPlayingService` for metadata,
/// and `RemoteCommandService` for media controls. After starting playback, pushes
/// `CPNowPlayingTemplate.shared` which reads from `MPNowPlayingInfoCenter` automatically.
@MainActor
final class CarPlayPlaybackController {
    private let mediaPlayer: MediaPlayer
    private let streamResolver: StreamResolver
    private let nowPlayingService = NowPlayingService()
    private let remoteCommandService = RemoteCommandService()
    private weak var interfaceController: CPInterfaceController?
    private let logger = BayitLogger(category: "CarPlayPlayback")

    init(
        mediaPlayer: MediaPlayer,
        streamResolver: StreamResolver,
        interfaceController: CPInterfaceController
    ) {
        self.mediaPlayer = mediaPlayer
        self.streamResolver = streamResolver
        self.interfaceController = interfaceController

        remoteCommandService.delegate = self
        remoteCommandService.register()
    }

    /// Start playback for the given content and push the Now Playing template.
    func play(contentId: String, contentType: ContentType) async {
        do {
            let resolved = try await streamResolver.resolveStream(
                contentId: contentId,
                contentType: contentType
            )
            startPlayback(
                url: resolved.url,
                title: resolved.title,
                subtitle: resolved.subtitle,
                artworkURL: resolved.artworkURL,
                contentType: contentType,
                contentId: contentId
            )
        } catch {
            logger.error("Failed to start playback", error: error, context: [
                "contentId": contentId,
                "type": contentType.rawValue,
            ])
        }
    }

    /// Play a direct URL when the stream URL is already known (e.g., podcast episode with audioUrl).
    func playDirectURL(
        url: URL,
        title: String,
        subtitle: String?,
        artworkURL: URL?,
        contentId: String,
        contentType: ContentType
    ) {
        startPlayback(
            url: url,
            title: title,
            subtitle: subtitle,
            artworkURL: artworkURL,
            contentType: contentType,
            contentId: contentId
        )
    }

    private func startPlayback(
        url: URL,
        title: String,
        subtitle: String?,
        artworkURL: URL?,
        contentType: ContentType,
        contentId: String
    ) {
        let mediaContentType = mediaContentType(from: contentType)
        mediaPlayer.load(url: url, contentType: mediaContentType)
        mediaPlayer.play()

        remoteCommandService.configureForContentType(mediaContentType)

        let metadata = NowPlayingMetadata(
            title: title,
            artist: subtitle,
            artworkURL: artworkURL,
            contentType: mediaContentType,
            isLiveStream: mediaContentType.isLive
        )

        nowPlayingService.update(
            metadata: metadata,
            currentTime: mediaPlayer.currentTime,
            duration: mediaPlayer.duration,
            rate: 1.0
        )

        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        interfaceController?.pushTemplate(nowPlayingTemplate, animated: true, completion: nil)

        logger.info("Playback started", context: [
            "contentId": contentId,
            "type": contentType.rawValue,
            "title": title,
        ])
    }

    /// Stop playback and clear Now Playing info.
    func stop() {
        mediaPlayer.stop()
        nowPlayingService.clear()
        remoteCommandService.unregister()
    }

    private func mediaContentType(from contentType: ContentType) -> MediaContentType {
        switch contentType {
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        case .live, .liveTV: return .liveTV
        case .movie, .series, .episode: return .vod
        case .youtubeVOD: return .youtubeVOD
        case .youtubeLive: return .youtubeLive
        }
    }
}

// MARK: - RemoteCommandDelegate

extension CarPlayPlaybackController: RemoteCommandDelegate {
    func remoteCommandPlay() {
        mediaPlayer.play()
        nowPlayingService.updatePosition(
            currentTime: mediaPlayer.currentTime,
            rate: 1.0
        )
    }

    func remoteCommandPause() {
        mediaPlayer.pause()
        nowPlayingService.updatePosition(
            currentTime: mediaPlayer.currentTime,
            rate: 0
        )
    }

    func remoteCommandTogglePlayPause() {
        mediaPlayer.togglePlayPause()
        let rate: Float = mediaPlayer.state == .playing ? 1.0 : 0
        nowPlayingService.updatePosition(
            currentTime: mediaPlayer.currentTime,
            rate: rate
        )
    }

    func remoteCommandSkipForward(interval: TimeInterval) {
        Task {
            await mediaPlayer.skipForward(seconds: interval)
            nowPlayingService.updatePosition(
                currentTime: mediaPlayer.currentTime,
                rate: mediaPlayer.rate
            )
        }
    }

    func remoteCommandSkipBackward(interval: TimeInterval) {
        Task {
            await mediaPlayer.skipBackward(seconds: interval)
            nowPlayingService.updatePosition(
                currentTime: mediaPlayer.currentTime,
                rate: mediaPlayer.rate
            )
        }
    }

    func remoteCommandSeek(to time: TimeInterval) {
        Task {
            await mediaPlayer.seek(to: time)
            nowPlayingService.updatePosition(
                currentTime: mediaPlayer.currentTime,
                rate: mediaPlayer.rate
            )
        }
    }
}
