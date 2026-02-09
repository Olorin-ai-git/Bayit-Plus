import WidgetKit
import SwiftUI
import BayitWidgetShared

/// Static timeline provider for the Quick Actions widget.
/// Never refreshes -- the widget content is always the same set of deep links.
struct QuickActionsTimelineProvider: TimelineProvider {

    func placeholder(in context: Context) -> QuickActionsEntry {
        QuickActionsEntry(date: .now)
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickActionsEntry) -> Void) {
        completion(QuickActionsEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickActionsEntry>) -> Void) {
        let entry = QuickActionsEntry(date: .now)
        // Never refresh -- static content
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

/// Entry for the Quick Actions widget. Contains only a date (content is static).
struct QuickActionsEntry: TimelineEntry {
    let date: Date
}

/// The Quick Actions widget definition.
struct QuickActionsWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.quickActions

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickActionsTimelineProvider()) { entry in
            QuickActionsWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Actions")
        .description("Quickly access Live TV, Radio, Podcasts, and more.")
        .supportedFamilies([.systemSmall, .systemMedium,
                            .accessoryInline, .accessoryCircular])
        .contentMarginsDisabled()
    }
}
