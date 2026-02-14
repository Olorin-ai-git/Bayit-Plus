import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Timeline provider for the Now Playing widget.
/// Reads current playback state from shared data and refreshes every 2 minutes.
struct NowPlayingTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "NowPlayingWidget")
    private static let refreshIntervalMinutes: TimeInterval = 2

    func placeholder(in context: Context) -> NowPlayingEntry {
        NowPlayingEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (NowPlayingEntry) -> Void) {
        Task { @Sendable in
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            let data = isAuthenticated ? await WidgetDataStore.shared.readNowPlaying() : nil
            completion(NowPlayingEntry(date: .now, nowPlaying: data))
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<NowPlayingEntry>) -> Void) {
        Task { @Sendable in
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            let data = isAuthenticated ? await WidgetDataStore.shared.readNowPlaying() : nil
            let entry = NowPlayingEntry(date: .now, nowPlaying: data)
            let refreshDate = Date().addingTimeInterval(Self.refreshIntervalMinutes * 60)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

/// Timeline entry for the Now Playing widget.
struct NowPlayingEntry: TimelineEntry {
    let date: Date
    let nowPlaying: SharedNowPlayingData?

    static let placeholder = NowPlayingEntry(date: .now, nowPlaying: nil)
}

/// The Now Playing widget definition.
struct NowPlayingWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.nowPlaying

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NowPlayingTimelineProvider()) { entry in
            NowPlayingWidgetView(entry: entry)
        }
        .configurationDisplayName("Now Playing")
        .description("See what is currently playing on Bayit+.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge,
                            .accessoryInline, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}
