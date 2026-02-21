#if os(tvOS)
    import BayitMedia
    import Foundation

    // MARK: - RemoteCommandDelegate

    extension TVAudioPlaybackManager: RemoteCommandDelegate {
        func remoteCommandPlay() {
            mediaPlayer.play()
            updateNowPlayingPosition()
        }

        func remoteCommandPause() {
            mediaPlayer.pause()
            updateNowPlayingPosition()
        }

        func remoteCommandTogglePlayPause() {
            togglePlayPause()
        }

        func remoteCommandSkipForward(interval: TimeInterval) {
            Task {
                await mediaPlayer.skipForward(seconds: interval)
                updateNowPlayingPosition()
            }
        }

        func remoteCommandSkipBackward(interval: TimeInterval) {
            Task {
                await mediaPlayer.skipBackward(seconds: interval)
                updateNowPlayingPosition()
            }
        }

        func remoteCommandSeek(to time: TimeInterval) {
            Task {
                await mediaPlayer.seek(to: time)
                updateNowPlayingPosition()
            }
        }
    }
#endif
