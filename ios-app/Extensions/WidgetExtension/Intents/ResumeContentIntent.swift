import AppIntents
import BayitWidgetShared

/// Resume watching a specific content item from the Continue Watching widget.
/// Opens the app and navigates to the player.
struct ResumeContentIntent: AppIntent {
    static let title: LocalizedStringResource = "Resume Content"
    static let description = IntentDescription("Resume watching content on Bayit+")
    static let openAppWhenRun = true

    @Parameter(title: "Content ID")
    var contentID: String

    @Parameter(title: "Content Title")
    var contentTitle: String

    @Parameter(title: "Content Type", default: "vod")
    var contentType: String

    static var parameterSummary: some ParameterSummary {
        Summary("Resume \(\.$contentTitle)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        guard SharedKeychainHelper().readAuthToken() != nil else {
            throw IntentError.notAuthenticated
        }

        let sharedType = SharedContentType(rawValue: contentType) ?? .vod
        let intent = SharedPendingIntent(
            action: PendingIntentActions.resumeContent,
            contentID: contentID,
            contentType: sharedType
        )
        await WidgetDataStore.shared.writePendingIntent(intent)
        return .result()
    }
}
