import AppIntents

/// Siri Shortcut: "Play [content] on Bayit Plus"
/// Opens the app and navigates to the player for the specified content.
struct PlayContentIntent: AppIntent {
    static var title: LocalizedStringResource = "Play Content"
    static var description = IntentDescription("Play content on Bayit Plus")
    static var openAppWhenRun = true

    @Parameter(title: "Content ID")
    var contentId: String

    @Parameter(title: "Content Title")
    var contentTitle: String

    @Parameter(title: "Content Type", default: "movie")
    var contentType: String

    static var parameterSummary: some ParameterSummary {
        Summary("Play \(\.$contentTitle)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let type = ContentType(rawValue: contentType) ?? .movie
        PendingIntentManager.shared.requestPlay(
            contentId: contentId,
            contentType: type
        )
        return .result()
    }
}

/// Siri Shortcut: "Watch Live TV on Bayit Plus"
struct WatchLiveTVIntent: AppIntent {
    static var title: LocalizedStringResource = "Watch Live TV"
    static var description = IntentDescription("Switch to Live TV on Bayit Plus")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        PendingIntentManager.shared.requestLiveTV()
        return .result()
    }
}

/// Siri Shortcut: "Listen to Radio on Bayit Plus"
struct ListenToRadioIntent: AppIntent {
    static var title: LocalizedStringResource = "Listen to Radio"
    static var description = IntentDescription("Switch to Radio on Bayit Plus")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        PendingIntentManager.shared.requestRadio()
        return .result()
    }
}

/// Siri Shortcut: "Listen to Podcasts on Bayit Plus"
struct ListenToPodcastsIntent: AppIntent {
    static var title: LocalizedStringResource = "Listen to Podcasts"
    static var description = IntentDescription("Switch to Podcasts on Bayit Plus")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        PendingIntentManager.shared.requestPodcasts()
        return .result()
    }
}
