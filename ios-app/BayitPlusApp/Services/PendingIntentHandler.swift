import BayitCore
import BayitMedia
import BayitWidgetShared
import Foundation

/// Handles pending intents written by widget extensions.
/// Validates, executes, and clears one-time widget actions.
@MainActor
final class PendingIntentHandler {

    private let logger = BayitLogger(category: "PendingIntentHandler")
    private let mediaPlayer: MediaPlayer
    private let store = WidgetDataStore.shared
    private var processedNonces = Set<String>()

    init(mediaPlayer: MediaPlayer) {
        self.mediaPlayer = mediaPlayer
    }

    /// Check for pending intents and execute them.
    /// Call this on app launch and scene activation.
    func processPendingIntents() async {
        guard let intent = await store.readPendingIntent() else {
            return
        }

        logger.debug("Processing pending intent", context: [
            "action": intent.action,
            "contentID": intent.contentID ?? "none"
        ])

        // Validate intent
        guard intent.isValid() else {
            logger.warning("Pending intent expired or invalid", context: [
                "action": intent.action,
                "age": String(Date().timeIntervalSince(intent.timestamp))
            ])
            await store.clearPendingIntent()
            return
        }

        // Prevent replay attacks - check nonce
        guard !processedNonces.contains(intent.nonce) else {
            logger.warning("Pending intent already processed (duplicate nonce)", context: [
                "nonce": intent.nonce
            ])
            await store.clearPendingIntent()
            return
        }

        // Execute action
        await executeIntent(intent)

        // Mark as processed
        processedNonces.insert(intent.nonce)

        // Clear from store
        await store.clearPendingIntent()

        logger.info("Pending intent executed and cleared", context: [
            "action": intent.action
        ])
    }

    /// Execute the validated pending intent.
    private func executeIntent(_ intent: SharedPendingIntent) async {
        switch intent.action {
        case PendingIntentActions.togglePlayPause:
            mediaPlayer.togglePlayPause()

        case PendingIntentActions.resumeContent:
            // Resume is handled by navigation to content
            logger.debug("Resume content handled by navigation")

        case PendingIntentActions.switchChannel:
            // Channel switch requires navigation
            logger.debug("Channel switch handled by navigation")

        case PendingIntentActions.playPlaylist:
            // Playlist playback requires navigation
            logger.debug("Playlist playback handled by navigation")

        case PendingIntentActions.shufflePlaylist:
            // Shuffle requires navigation to playlist
            logger.debug("Shuffle playlist handled by navigation")

        default:
            logger.warning("Unknown pending intent action", context: [
                "action": intent.action
            ])
        }
    }

    /// Clear all processed nonces.
    /// Call periodically to prevent memory growth.
    /// Since pending intents expire in 5 minutes, clearing all nonces after 10 minutes is safe.
    func cleanupProcessedNonces() {
        processedNonces.removeAll()
        logger.debug("Cleaned up processed nonces")
    }
}
