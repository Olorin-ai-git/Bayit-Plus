import AppIntents
import BayitWidgetShared

/// Shuffle a playlist from the Playlist widget.
/// Opens the app and starts shuffled playback of the specified playlist.
struct ShufflePlaylistIntent: AppIntent {
    static let title: LocalizedStringResource = "Shuffle Playlist"
    static let description = IntentDescription("Shuffle a playlist on Bayit+")
    static let openAppWhenRun = true

    @Parameter(title: "Playlist ID")
    var playlistID: String

    @Parameter(title: "Playlist Name")
    var playlistName: String

    static var parameterSummary: some ParameterSummary {
        Summary("Shuffle \(\.$playlistName)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        guard SharedKeychainHelper().readAuthToken() != nil else {
            throw WidgetIntentError.notAuthenticated
        }

        let intent = SharedPendingIntent(
            action: PendingIntentActions.shufflePlaylist,
            contentID: playlistID
        )
        await WidgetDataStore.shared.writePendingIntent(intent)
        return .result()
    }
}
