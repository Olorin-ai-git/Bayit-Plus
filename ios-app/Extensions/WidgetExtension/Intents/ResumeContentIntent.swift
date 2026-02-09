import AppIntents
import BayitWidgetShared

/// Resume watching a specific content item from the Continue Watching widget.
/// Opens the app and navigates to the player.
struct ResumeContentIntent: AppIntent {
    static var title: LocalizedStringResource = "Resume Content"
    static var description = IntentDescription("Resume watching content on Bayit+")
    static var openAppWhenRun = true

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
        let sharedType = SharedContentType(rawValue: contentType) ?? .vod
        let intent = SharedPendingIntent(
            action: "resumeContent",
            contentID: contentID,
            contentType: sharedType
        )
        await WidgetDataStore.shared.writePendingIntent(intent)
        return .result()
    }
}
