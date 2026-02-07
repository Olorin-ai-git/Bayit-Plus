import AppIntents

/// Siri Shortcut: "Search for [query] on Bayit Plus"
/// Opens the app and navigates to the search screen.
struct SearchContentIntent: AppIntent {
    static var title: LocalizedStringResource = "Search Content"
    static var description = IntentDescription("Search for content on Bayit Plus")
    static var openAppWhenRun = true

    @Parameter(title: "Search Query")
    var query: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Search for \(\.$query)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        PendingIntentManager.shared.requestSearch(query: query)
        return .result()
    }
}
