import AppIntents
import BayitWidgetShared
import WidgetKit

/// In-widget play/pause toggle.
/// Writes a pending intent for the main app to handle.
@available(iOS 17.0, *)
struct TogglePlayPauseIntent: AppIntent {
    static let title: LocalizedStringResource = "Toggle Play/Pause"
    static let description = IntentDescription("Toggle playback on Bayit+")
    static let openAppWhenRun = true

    @Parameter(title: "Content ID")
    var contentID: String?

    @Parameter(title: "Is Playing")
    var isPlaying: Bool?

    @MainActor
    func perform() async throws -> some IntentResult {
        // Verify authentication before allowing playback control
        guard SharedKeychainHelper().readAuthToken() != nil else {
            throw IntentError.notAuthenticated
        }

        // Write pending intent for main app to handle
        let store = WidgetDataStore.shared
        let intent = SharedPendingIntent(
            action: PendingIntentActions.togglePlayPause,
            contentID: contentID,
            contentType: nil,
            timestamp: .now
        )
        await store.writePendingIntent(intent)

        // Immediately update widget data to reflect the toggle
        if let data = await store.readNowPlaying() {
            let toggled = SharedNowPlayingData(
                channelName: data.channelName,
                showTitle: data.showTitle,
                logoURL: data.logoURL,
                progress: data.progress,
                isPlaying: !(isPlaying ?? data.isPlaying),
                contentType: data.contentType,
                nextShowTitle: data.nextShowTitle,
                nextShowTime: data.nextShowTime,
                channelID: data.channelID
            )
            await store.writeNowPlaying(toggled)
        }

        // Reload widget timeline to show updated state
        WidgetCenter.shared.reloadTimelines(
            ofKind: WidgetConfigurationKeys.WidgetKind.nowPlaying
        )

        return .result()
    }
}
