import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Timeline provider for the Continue Watching widget.
/// Reads watch history from shared data. Requires auth for meaningful content.
struct ContinueWatchingTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "ContinueWatchingWidget")
    private static let refreshIntervalMinutes: TimeInterval = 15

    func placeholder(in context: Context) -> ContinueWatchingEntry {
        ContinueWatchingEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (ContinueWatchingEntry) -> Void) {
        Task {
            let items = await WidgetDataStore.shared.readContinueWatching()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            completion(ContinueWatchingEntry(
                date: .now,
                items: items,
                isAuthenticated: isAuthenticated
            ))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ContinueWatchingEntry>) -> Void) {
        Task {
            let items = await WidgetDataStore.shared.readContinueWatching()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            let entry = ContinueWatchingEntry(
                date: .now,
                items: items,
                isAuthenticated: isAuthenticated
            )
            let refreshDate = Date().addingTimeInterval(Self.refreshIntervalMinutes * 60)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

/// Timeline entry for the Continue Watching widget.
struct ContinueWatchingEntry: TimelineEntry {
    let date: Date
    let items: [SharedContinueWatchingItem]
    let isAuthenticated: Bool

    static let placeholder = ContinueWatchingEntry(
        date: .now,
        items: [],
        isAuthenticated: true
    )
}

/// The Continue Watching widget definition.
struct ContinueWatchingWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.continueWatching

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ContinueWatchingTimelineProvider()) { entry in
            ContinueWatchingWidgetView(entry: entry)
        }
        .configurationDisplayName("Continue Watching")
        .description("Resume where you left off.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
