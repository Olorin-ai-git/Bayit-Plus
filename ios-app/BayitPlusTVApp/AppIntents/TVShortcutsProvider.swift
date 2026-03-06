#if os(tvOS)
    import AppIntents

    /// Provides pre-built Siri Shortcuts for the tvOS app.
    /// Bilingual: English and Hebrew invocation phrases.
    struct TVShortcutsProvider: AppShortcutsProvider {
        static var appShortcuts: [AppShortcut] {
            AppShortcut(
                intent: TVPlayContentIntent(),
                phrases: [
                    "Play something on \(.applicationName)",
                    "Watch something on \(.applicationName)",
                ],
                shortTitle: "Play Content",
                systemImageName: "play.fill"
            )

            AppShortcut(
                intent: TVSearchContentIntent(),
                phrases: [
                    "Search \(.applicationName)",
                    "Search on \(.applicationName)",
                    "Find content on \(.applicationName)",
                ],
                shortTitle: "Search",
                systemImageName: "magnifyingglass"
            )

            AppShortcut(
                intent: TVResumeWatchingIntent(),
                phrases: [
                    "Resume watching on \(.applicationName)",
                    "Continue watching on \(.applicationName)",
                ],
                shortTitle: "Resume Watching",
                systemImageName: "play.circle"
            )

            AppShortcut(
                intent: TVWatchLiveTVIntent(),
                phrases: [
                    "Watch live TV on \(.applicationName)",
                    "Open live channels on \(.applicationName)",
                ],
                shortTitle: "Live TV",
                systemImageName: "tv"
            )

            AppShortcut(
                intent: TVListenToRadioIntent(),
                phrases: [
                    "Listen to radio on \(.applicationName)",
                    "Play radio on \(.applicationName)",
                ],
                shortTitle: "Radio",
                systemImageName: "radio"
            )

            AppShortcut(
                intent: TVListenToPodcastsIntent(),
                phrases: [
                    "Listen to podcasts on \(.applicationName)",
                    "Play podcasts on \(.applicationName)",
                ],
                shortTitle: "Podcasts",
                systemImageName: "headphones"
            )
        }
    }
#endif
