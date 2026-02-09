import AppIntents
import BayitWidgetShared

/// Play a playlist from the Playlist widget.
/// Opens the app and starts playback of the specified playlist.
struct PlayPlaylistIntent: AppIntent {
    static var title: LocalizedStringResource = "Play Playlist"
    static var description = IntentDescription("Play a playlist on Bayit+")
    static var openAppWhenRun = true

    @Parameter(title: "Playlist ID")
    var playlistID: String

    @Parameter(title: "Playlist Name")
    var playlistName: String

    static var parameterSummary: some ParameterSummary {
        Summary("Play \(\.$playlistName)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let intent = SharedPendingIntent(
            action: "playPlaylist",
            contentID: playlistID
        )
        await WidgetDataStore.shared.writePendingIntent(intent)
        return .result()
    }
}
