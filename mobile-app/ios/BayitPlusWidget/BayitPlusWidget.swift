//
//  BayitPlusWidget.swift
//  Continue Watching Widget for Bayit+
//
//  Shows user's recently watched content with quick resume functionality
//

import WidgetKit
import SwiftUI

struct ContinueWatchingEntry: TimelineEntry {
    let date: Date
    let content: [WatchingContent]
    let isPlaceholder: Bool
}

struct WatchingContent: Identifiable, Codable {
    let id: String
    let title: String
    let type: String // "movie", "series", "audiobook", "podcast"
    let coverUrl: String?
    let progress: Double // 0.0 to 1.0
    let duration: Int // seconds
    let position: Int // seconds

    var formattedProgress: String {
        let percent = Int(progress * 100)
        return "\(percent)%"
    }

    var formattedTimeRemaining: String {
        let remaining = duration - position
        let minutes = remaining / 60
        if minutes < 60 {
            return "\(minutes)m left"
        }
        let hours = minutes / 60
        let mins = minutes % 60
        return "\(hours)h \(mins)m left"
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ContinueWatchingEntry {
        ContinueWatchingEntry(
            date: Date(),
            content: [
                WatchingContent(
                    id: "placeholder-1",
                    title: "The Chosen",
                    type: "series",
                    coverUrl: nil,
                    progress: 0.65,
                    duration: 3600,
                    position: 2340
                )
            ],
            isPlaceholder: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ContinueWatchingEntry) -> ()) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }

        Task {
            let content = await WidgetNetworkService.fetchContinueWatching()
            let entry = ContinueWatchingEntry(
                date: Date(),
                content: content ?? [],
                isPlaceholder: false
            )
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        Task {
            let currentDate = Date()
            let content = await WidgetNetworkService.fetchContinueWatching()

            let entry = ContinueWatchingEntry(
                date: currentDate,
                content: content ?? [],
                isPlaceholder: false
            )

            // Refresh in 30 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate)!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

            completion(timeline)
        }
    }
}

struct ContinueWatchingWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        switch widgetFamily {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        if let content = entry.content.first {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "0d0d1a"), Color(hex: "1a1a2e")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: 8) {
                    // Cover image
                    if let coverUrl = content.coverUrl, let url = URL(string: coverUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.white.opacity(0.1))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                            .frame(maxWidth: .infinity)
                            .frame(height: 80)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                Image(systemName: iconForType(content.type))
                                    .font(.system(size: 32))
                                    .foregroundColor(.white.opacity(0.3))
                            )
                    }

                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 4)
                                .cornerRadius(2)

                            Rectangle()
                                .fill(Color(hex: "4A90E2"))
                                .frame(width: geometry.size.width * CGFloat(content.progress), height: 4)
                                .cornerRadius(2)
                        }
                    }
                    .frame(height: 4)

                    // Title
                    Text(content.title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                .padding(12)
            }
            .widgetURL(URL(string: "bayit://play/\(content.id)?type=\(content.type)&t=\(content.position)")!)
        } else {
            EmptyWidgetView(size: .small)
        }
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "movie": return "film"
        case "series": return "tv"
        case "audiobook": return "book.fill"
        case "podcast": return "mic.fill"
        default: return "play.circle"
        }
    }
}

struct MediumWidgetView: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        if let content = entry.content.first {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "0d0d1a"), Color(hex: "1a1a2e")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                HStack(spacing: 12) {
                    // Cover image
                    if let coverUrl = content.coverUrl, let url = URL(string: coverUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.white.opacity(0.1))
                        }
                        .frame(width: 100, height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 100, height: 140)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                Image(systemName: iconForType(content.type))
                                    .font(.system(size: 40))
                                    .foregroundColor(.white.opacity(0.3))
                            )
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        // Title
                        Text(content.title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(2)

                        // Type badge
                        Text(content.type.capitalized)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: "4A90E2"))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(hex: "4A90E2").opacity(0.2))
                            .cornerRadius(8)

                        Spacer()

                        // Progress info
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(content.formattedProgress)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: "4A90E2"))

                                Spacer()

                                Text(content.formattedTimeRemaining)
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.6))
                            }

                            // Progress bar
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(Color.white.opacity(0.2))
                                        .frame(height: 4)
                                        .cornerRadius(2)

                                    Rectangle()
                                        .fill(Color(hex: "4A90E2"))
                                        .frame(width: geometry.size.width * CGFloat(content.progress), height: 4)
                                        .cornerRadius(2)
                                }
                            }
                            .frame(height: 4)
                        }

                        // Resume button
                        HStack {
                            Image(systemName: "play.fill")
                                .font(.system(size: 10))
                            Text("Resume")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(hex: "4A90E2"))
                        .cornerRadius(8)
                    }
                }
                .padding(16)
            }
            .widgetURL(URL(string: "bayit://play/\(content.id)?type=\(content.type)&t=\(content.position)")!)
        } else {
            EmptyWidgetView(size: .medium)
        }
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "movie": return "film"
        case "series": return "tv"
        case "audiobook": return "book.fill"
        case "podcast": return "mic.fill"
        default: return "play.circle"
        }
    }
}

struct LargeWidgetView: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "0d0d1a"), Color(hex: "1a1a2e")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(Color(hex: "4A90E2"))

                    Text("Continue Watching")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    Spacer()
                }

                if !entry.content.isEmpty {
                    ForEach(entry.content.prefix(3)) { content in
                        ContentRow(content: content)
                    }

                    Spacer()
                } else {
                    EmptyWidgetView(size: .large)
                }
            }
            .padding(16)
        }
    }
}

struct ContentRow: View {
    let content: WatchingContent

    var body: some View {
        Link(destination: URL(string: "bayit://play/\(content.id)?type=\(content.type)&t=\(content.position)")!) {
            HStack(spacing: 12) {
                // Cover image
                if let coverUrl = content.coverUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                    }
                    .frame(width: 60, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 60, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(content.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    Text(content.formattedTimeRemaining)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.6))

                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 3)
                                .cornerRadius(1.5)

                            Rectangle()
                                .fill(Color(hex: "4A90E2"))
                                .frame(width: geometry.size.width * CGFloat(content.progress), height: 3)
                                .cornerRadius(1.5)
                        }
                    }
                    .frame(height: 3)
                }

                Spacer()

                Image(systemName: "play.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "4A90E2"))
            }
            .padding(12)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
        }
    }
}

struct EmptyWidgetView: View {
    enum WidgetSize {
        case small, medium, large
    }

    let size: WidgetSize

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "0d0d1a"), Color(hex: "1a1a2e")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                Image(systemName: "play.circle")
                    .font(.system(size: size == .small ? 32 : 40))
                    .foregroundColor(.white.opacity(0.3))

                if size != .small {
                    Text("No recent content")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))

                    Text("Start watching to see progress")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
        .widgetURL(URL(string: "bayit://")!)
    }
}

@main
struct BayitPlusWidget: Widget {
    let kind: String = "BayitPlusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ContinueWatchingWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Continue Watching")
        .description("Quickly resume your favorite shows, movies, and audiobooks.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// Preview
struct BayitPlusWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ContinueWatchingWidgetEntryView(entry: ContinueWatchingEntry(
                date: Date(),
                content: [
                    WatchingContent(
                        id: "test-1",
                        title: "The Chosen: Season 2",
                        type: "series",
                        coverUrl: nil,
                        progress: 0.65,
                        duration: 3600,
                        position: 2340
                    )
                ],
                isPlaceholder: false
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))

            ContinueWatchingWidgetEntryView(entry: ContinueWatchingEntry(
                date: Date(),
                content: [
                    WatchingContent(
                        id: "test-1",
                        title: "The Chosen: Season 2",
                        type: "series",
                        coverUrl: nil,
                        progress: 0.65,
                        duration: 3600,
                        position: 2340
                    )
                ],
                isPlaceholder: false
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))

            ContinueWatchingWidgetEntryView(entry: ContinueWatchingEntry(
                date: Date(),
                content: [
                    WatchingContent(
                        id: "test-1",
                        title: "The Chosen: Season 2",
                        type: "series",
                        coverUrl: nil,
                        progress: 0.65,
                        duration: 3600,
                        position: 2340
                    ),
                    WatchingContent(
                        id: "test-2",
                        title: "Sapiens: A Brief History",
                        type: "audiobook",
                        coverUrl: nil,
                        progress: 0.35,
                        duration: 28800,
                        position: 10080
                    ),
                    WatchingContent(
                        id: "test-3",
                        title: "Torah Podcast",
                        type: "podcast",
                        coverUrl: nil,
                        progress: 0.80,
                        duration: 2700,
                        position: 2160
                    )
                ],
                isPlaceholder: false
            ))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
        }
    }
}

// Color extension for hex colors
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
