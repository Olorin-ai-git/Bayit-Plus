#if os(tvOS)
    import AppIntents

    /// Siri Shortcut: "Play [content] on Bayit Plus"
    struct TVPlayContentIntent: AppIntent {
        static var title: LocalizedStringResource = "Play Content"
        static var description = IntentDescription(
            "Play content on Bayit Plus"
        )
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
            TVPendingIntentManager.shared.requestPlay(
                contentId: contentId,
                contentType: contentType
            )
            return .result()
        }
    }

    /// Siri Shortcut: "Search on Bayit Plus"
    struct TVSearchContentIntent: AppIntent {
        static var title: LocalizedStringResource = "Search Content"
        static var description = IntentDescription(
            "Search for content on Bayit Plus"
        )
        static var openAppWhenRun = true

        @Parameter(title: "Search Query")
        var query: String?

        static var parameterSummary: some ParameterSummary {
            Summary("Search for \(\.$query)")
        }

        @MainActor
        func perform() async throws -> some IntentResult {
            TVPendingIntentManager.shared.requestSearch(query: query)
            return .result()
        }
    }

    /// Siri Shortcut: "Resume watching on Bayit Plus"
    struct TVResumeWatchingIntent: AppIntent {
        static var title: LocalizedStringResource = "Resume Watching"
        static var description = IntentDescription(
            "Resume watching your last content on Bayit Plus"
        )
        static var openAppWhenRun = true

        @MainActor
        func perform() async throws -> some IntentResult {
            TVPendingIntentManager.shared.requestResume()
            return .result()
        }
    }

    /// Siri Shortcut: "Watch Live TV on Bayit Plus"
    struct TVWatchLiveTVIntent: AppIntent {
        static var title: LocalizedStringResource = "Watch Live TV"
        static var description = IntentDescription(
            "Switch to Live TV on Bayit Plus"
        )
        static var openAppWhenRun = true

        @MainActor
        func perform() async throws -> some IntentResult {
            TVPendingIntentManager.shared.requestLiveTV()
            return .result()
        }
    }

    /// Siri Shortcut: "Listen to Radio on Bayit Plus"
    struct TVListenToRadioIntent: AppIntent {
        static var title: LocalizedStringResource = "Listen to Radio"
        static var description = IntentDescription(
            "Switch to Radio on Bayit Plus"
        )
        static var openAppWhenRun = true

        @MainActor
        func perform() async throws -> some IntentResult {
            TVPendingIntentManager.shared.requestRadio()
            return .result()
        }
    }

    /// Siri Shortcut: "Listen to Podcasts on Bayit Plus"
    struct TVListenToPodcastsIntent: AppIntent {
        static var title: LocalizedStringResource = "Listen to Podcasts"
        static var description = IntentDescription(
            "Switch to Podcasts on Bayit Plus"
        )
        static var openAppWhenRun = true

        @MainActor
        func perform() async throws -> some IntentResult {
            TVPendingIntentManager.shared.requestPodcasts()
            return .result()
        }
    }
#endif
