import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVMovieDetailView + Trailer Logic

extension TVMovieDetailView {
    func setupTrailerPlayer() {
        guard let detail = viewModel?.detail,
              detail.trailerUrl != nil || detail.trailerStreamUrl != nil
        else { return }

        Task {
            do {
                let response = try await repos.content.fetchTrailerStream(
                    contentId: detail.id
                )
                guard let streamUrl = response.streamUrl,
                      let url = URL(string: streamUrl)
                else { return }

                resolvedTrailerUrl = streamUrl

                let item = AVPlayerItem(url: url)
                let player = AVPlayer(playerItem: item)
                player.isMuted = true

                // Wait until the player has video frames before showing
                let statusOk = await withCheckedContinuation { cont in
                    var observer: NSKeyValueObservation?
                    observer = item.observe(\.status) { item, _ in
                        observer?.invalidate()
                        cont.resume(returning: item.status == .readyToPlay)
                    }
                }

                guard statusOk else {
                    logger.warning(
                        "Trailer AVPlayerItem failed to load",
                        context: ["movieId": detail.id]
                    )
                    return
                }

                player.play()

                NotificationCenter.default.addObserver(
                    forName: .AVPlayerItemDidPlayToEndTime,
                    object: player.currentItem,
                    queue: .main
                ) { _ in
                    player.seek(to: .zero)
                    player.play()
                }

                trailerPlayer = player
            } catch {
                logger.warning(
                    "Trailer resolution failed, using backdrop image",
                    context: ["movieId": detail.id]
                )
            }
        }
    }

    func resolveAndShowTrailer(contentId: String) async {
        if resolvedTrailerUrl != nil {
            showTrailer = true
            return
        }

        do {
            let response = try await repos.content.fetchTrailerStream(
                contentId: contentId
            )
            if let streamUrl = response.streamUrl {
                resolvedTrailerUrl = streamUrl
                showTrailer = true
            }
        } catch {
            logger.warning(
                "Could not resolve trailer for fullscreen",
                context: ["contentId": contentId]
            )
        }
    }
}
