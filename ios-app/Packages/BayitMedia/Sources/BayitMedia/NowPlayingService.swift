import BayitCore
import Foundation
import MediaPlayer
import UIKit

/// Manages the MPNowPlayingInfoCenter for lock screen and Control Center display.
///
/// Ported from AudioSessionManager.updateNowPlayingInfo(), converting to async/await
/// and removing RCT bridge dependencies.
public final class NowPlayingService: Sendable {

    private let logger = BayitLogger(category: "NowPlaying")

    public init() {}

    /// Update the Now Playing info displayed on lock screen and Control Center.
    public func update(
        metadata: NowPlayingMetadata,
        currentTime: TimeInterval,
        duration: TimeInterval,
        rate: Float
    ) {
        var info = [String: Any]()
        info[MPMediaItemPropertyTitle] = metadata.title
        info[MPMediaItemPropertyArtist] = metadata.artist ?? ""
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = rate

        if let albumTitle = metadata.albumTitle {
            info[MPMediaItemPropertyAlbumTitle] = albumTitle
        }

        if metadata.isLiveStream {
            info[MPNowPlayingInfoPropertyIsLiveStream] = true
        } else {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }

        if let artworkURL = metadata.artworkURL {
            loadArtwork(from: artworkURL) { [weak self] artwork in
                guard self != nil else { return }
                var updatedInfo = info
                if let artwork {
                    updatedInfo[MPMediaItemPropertyArtwork] = artwork
                }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = updatedInfo
            }
        } else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }

        logger.debug(
            "Now playing updated",
            context: ["title": metadata.title]
        )
    }

    /// Clear the Now Playing info.
    public func clear() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        logger.debug("Now playing cleared")
    }

    /// Update only the playback position (lightweight update during seek).
    public func updatePosition(currentTime: TimeInterval, rate: Float) {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = rate
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    // MARK: - Private

    private func loadArtwork(
        from url: URL,
        completion: @escaping @Sendable (MPMediaItemArtwork?) -> Void
    ) {
        URLSession.shared.dataTask(with: url) { data, _, error in
            guard let data, error == nil, let image = UIImage(data: data) else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
            DispatchQueue.main.async { completion(artwork) }
        }.resume()
    }
}
