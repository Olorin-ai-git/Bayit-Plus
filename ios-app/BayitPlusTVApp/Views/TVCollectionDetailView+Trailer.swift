#if os(tvOS)
    import AVFoundation
    import BayitCore
    import SwiftUI

    // MARK: - TVCollectionDetailView + Trailer Logic

    extension TVCollectionDetailView {
        /// Loads the collection trailer (from the first movie) into the backdrop player.
        func setupCollectionTrailer(streamUrl: String) {
            guard let url = URL(string: streamUrl) else { return }
            Task {
                let item = AVPlayerItem(url: url)
                let player = AVPlayer(playerItem: item)
                player.isMuted = true

                let statusOk = await withCheckedContinuation { cont in
                    var observer: NSKeyValueObservation?
                    observer = item.observe(\.status) { item, _ in
                        observer?.invalidate()
                        cont.resume(returning: item.status == .readyToPlay)
                    }
                }

                guard statusOk else {
                    logger.warning(
                        "Collection trailer failed to load",
                        context: ["collectionId": collectionId]
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
                resolvedTrailerUrl = streamUrl
            }
        }
    }
#endif
