import AppIntents

/// Siri Shortcut: "Resume watching on Bayit Plus"
/// Opens the app and resumes the last played content.
struct ResumeWatchingIntent: AppIntent {
    static var title: LocalizedStringResource = "Resume Watching"
    static var description = IntentDescription(
        "Resume watching your last content on Bayit Plus"
    )
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        PendingIntentManager.shared.requestResume()
        return .result()
    }
}
