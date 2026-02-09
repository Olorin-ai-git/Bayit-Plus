import AppIntents
import BayitWidgetShared

/// In-widget play/pause toggle.
/// Toggles the current playback state without opening the app.
struct TogglePlayPauseIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Play/Pause"
    static var description = IntentDescription("Toggle playback on Bayit+")
    static var openAppWhenRun = false

    @MainActor
    func perform() async throws -> some IntentResult {
        // Read current state and toggle
        let store = WidgetDataStore.shared
        if var data = await store.readNowPlaying() {
            let toggled = SharedNowPlayingData(
                channelName: data.channelName,
                showTitle: data.showTitle,
                logoURL: data.logoURL,
                progress: data.progress,
                isPlaying: !data.isPlaying,
                contentType: data.contentType,
                nextShowTitle: data.nextShowTitle,
                nextShowTime: data.nextShowTime,
                channelID: data.channelID
            )
            await store.writeNowPlaying(toggled)
        }
        return .result()
    }
}
