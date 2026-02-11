import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Timeline provider for the Trending News widget.
/// Reads trending summary from shared data. No auth required.
struct TrendingNewsTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "TrendingNewsWidget")
    private static let refreshIntervalMinutes: TimeInterval = 30

    func placeholder(in context: Context) -> TrendingNewsEntry {
        TrendingNewsEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (TrendingNewsEntry) -> Void) {
        Task { @Sendable in
            let summary = await WidgetDataStore.shared.readTrendingSummary()
            completion(TrendingNewsEntry(date: .now, summary: summary))
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<TrendingNewsEntry>) -> Void) {
        Task { @Sendable in
            let summary = await WidgetDataStore.shared.readTrendingSummary()
            let entry = TrendingNewsEntry(date: .now, summary: summary)
            let refreshDate = Date().addingTimeInterval(Self.refreshIntervalMinutes * 60)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

/// Timeline entry for the Trending News widget.
struct TrendingNewsEntry: TimelineEntry {
    let date: Date
    let summary: SharedTrendingSummary?

    static let placeholder = TrendingNewsEntry(
        date: .now,
        summary: SharedTrendingSummary(
            topStory: "Loading top stories...",
            overallMood: "neutral",
            topics: [],
            lastUpdated: .now
        )
    )
}

/// The Trending News widget definition.
struct TrendingNewsWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.trendingNews

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TrendingNewsTimelineProvider()) { entry in
            TrendingNewsWidgetView(entry: entry)
        }
        .configurationDisplayName("Trending News")
        .description("Stay updated with trending stories.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
