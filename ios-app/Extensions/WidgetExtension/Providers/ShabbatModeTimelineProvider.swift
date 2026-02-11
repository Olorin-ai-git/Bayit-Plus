import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Timeline provider for the Shabbat Mode widget.
/// Reads shared Shabbat data and generates entries with countdown updates.
struct ShabbatModeTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "ShabbatWidget")

    func placeholder(in context: Context) -> ShabbatModeEntry {
        ShabbatModeEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (ShabbatModeEntry) -> Void) {
        Task { @Sendable in
            let data = await WidgetDataStore.shared.readShabbatData()
            let entry = ShabbatModeEntry(date: .now, shabbatData: data)
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<ShabbatModeEntry>) -> Void) {
        Task { @Sendable in
            let data = await WidgetDataStore.shared.readShabbatData()
            var entries: [ShabbatModeEntry] = []

            // Generate entries for the next hour at 1-minute intervals
            // for smooth countdown display near candle-lighting time
            let now = Date()
            let entryCount = 60
            let intervalSeconds: TimeInterval = 60

            for i in 0..<entryCount {
                let entryDate = now.addingTimeInterval(Double(i) * intervalSeconds)
                entries.append(ShabbatModeEntry(date: entryDate, shabbatData: data))
            }

            // Refresh from shared data every 5 minutes
            let refreshDate = now.addingTimeInterval(intervalSeconds * Double(entryCount))
            let timeline = Timeline(entries: entries, policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

/// Timeline entry for the Shabbat Mode widget.
struct ShabbatModeEntry: TimelineEntry {
    let date: Date
    let shabbatData: SharedShabbatData?

    static let placeholder = ShabbatModeEntry(
        date: .now,
        shabbatData: nil
    )
}

/// The Shabbat Mode widget definition.
struct ShabbatModeWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.shabbatMode

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ShabbatModeTimelineProvider()) { entry in
            ShabbatModeWidgetView(entry: entry)
        }
        .configurationDisplayName("Shabbat Mode")
        .description("Candle lighting, havdalah times, parasha, and countdown.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge,
                            .accessoryInline, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}
