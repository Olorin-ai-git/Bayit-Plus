import AppIntents

/// Provides pre-built Siri Shortcuts that appear in the Shortcuts app
/// under the "Bayit Plus" section.
struct BayitShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PlayContentIntent(),
            phrases: [
                "Play something on \(.applicationName)",
                "Watch something on \(.applicationName)",
            ],
            shortTitle: "Play Content",
            systemImageName: "play.fill"
        )

        AppShortcut(
            intent: SearchContentIntent(),
            phrases: [
                "Search \(.applicationName)",
                "Search on \(.applicationName)",
                "Find content on \(.applicationName)",
            ],
            shortTitle: "Search",
            systemImageName: "magnifyingglass"
        )

        AppShortcut(
            intent: ResumeWatchingIntent(),
            phrases: [
                "Resume watching on \(.applicationName)",
                "Continue watching on \(.applicationName)",
            ],
            shortTitle: "Resume Watching",
            systemImageName: "play.circle"
        )

        AppShortcut(
            intent: WatchLiveTVIntent(),
            phrases: [
                "Watch live TV on \(.applicationName)",
                "Open live channels on \(.applicationName)",
            ],
            shortTitle: "Live TV",
            systemImageName: "tv"
        )

        AppShortcut(
            intent: ListenToRadioIntent(),
            phrases: [
                "Listen to radio on \(.applicationName)",
                "Play radio on \(.applicationName)",
            ],
            shortTitle: "Radio",
            systemImageName: "radio"
        )

        AppShortcut(
            intent: ListenToPodcastsIntent(),
            phrases: [
                "Listen to podcasts on \(.applicationName)",
                "Play podcasts on \(.applicationName)",
            ],
            shortTitle: "Podcasts",
            systemImageName: "headphones"
        )
    }
}
