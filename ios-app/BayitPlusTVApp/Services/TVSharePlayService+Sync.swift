#if os(tvOS)
    import BayitCore
    import Foundation
    import GroupActivities

    /// Playback synchronization extension for TVSharePlayService.
    /// Sends and handles play/pause/seek messages via GroupSessionMessenger.
    extension TVSharePlayService {
        // MARK: - Send Playback State

        func sendPlay(position: Double, senderId: String) async {
            await sendPlaybackMessage(
                action: .play,
                position: position,
                senderId: senderId
            )
        }

        func sendPause(position: Double, senderId: String) async {
            await sendPlaybackMessage(
                action: .pause,
                position: position,
                senderId: senderId
            )
        }

        func sendSeek(position: Double, senderId: String) async {
            isSynced = false
            await sendPlaybackMessage(
                action: .seek,
                position: position,
                senderId: senderId
            )
        }

        // MARK: - Send Content Change

        func sendContentChange(
            contentId: String,
            contentType: String,
            contentTitle: String
        ) async {
            guard let messenger else { return }

            let message = SharePlayContentMessage(
                contentId: contentId,
                contentType: contentType,
                contentTitle: contentTitle
            )

            do {
                try await messenger.send(message)
            } catch {
                let logger = BayitLogger(category: "TVSharePlaySync")
                logger.error("Failed to send content change: \(error)")
            }
        }

        // MARK: - Private

        private func sendPlaybackMessage(
            action: SharePlayAction,
            position: Double,
            senderId: String
        ) async {
            guard let messenger else { return }

            let message = SharePlayPlaybackMessage(
                action: action,
                position: position,
                timestamp: Date().timeIntervalSince1970,
                senderId: senderId
            )

            do {
                try await messenger.send(message)
            } catch {
                let logger = BayitLogger(category: "TVSharePlaySync")
                logger.error("Failed to send playback sync: \(error)")
            }
        }
    }
#endif
