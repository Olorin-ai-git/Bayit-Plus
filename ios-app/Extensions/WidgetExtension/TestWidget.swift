import SwiftUI
import WidgetKit

// Minimal test widget to verify widget system is working
struct TestWidgetEntry: TimelineEntry {
    let date: Date
}

struct TestWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TestWidgetEntry {
        TestWidgetEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (TestWidgetEntry) -> Void) {
        completion(TestWidgetEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TestWidgetEntry>) -> Void) {
        let entry = TestWidgetEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct TestWidget: Widget {
    let kind = "BayitTestWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TestWidgetProvider()) { entry in
            ZStack {
                Color.blue
                Text("TEST WIDGET")
                    .foregroundColor(.white)
                    .font(.headline)
            }
        }
        .configurationDisplayName("Test Widget")
        .description("A simple test widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
