import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Timeline provider for the Playlist widget.
/// Reads playlists from shared data. Auth required.
struct PlaylistTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "PlaylistWidget")
    private static let refreshIntervalMinutes: TimeInterval = 15

    func placeholder(in context: Context) -> PlaylistEntry {
        PlaylistEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (PlaylistEntry) -> Void) {
        Task {
            let playlists = await WidgetDataStore.shared.readPlaylists()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            completion(PlaylistEntry(
                date: .now,
                playlists: playlists,
                isAuthenticated: isAuthenticated
            ))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PlaylistEntry>) -> Void) {
        Task {
            let playlists = await WidgetDataStore.shared.readPlaylists()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            let entry = PlaylistEntry(
                date: .now,
                playlists: playlists,
                isAuthenticated: isAuthenticated
            )
            let refreshDate = Date().addingTimeInterval(Self.refreshIntervalMinutes * 60)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

/// Timeline entry for the Playlist widget.
struct PlaylistEntry: TimelineEntry {
    let date: Date
    let playlists: [SharedPlaylistItem]
    let isAuthenticated: Bool

    static let placeholder = PlaylistEntry(
        date: .now,
        playlists: [],
        isAuthenticated: true
    )
}

/// The Playlist widget definition.
struct PlaylistWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.playlist

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PlaylistTimelineProvider()) { entry in
            PlaylistWidgetView(entry: entry)
        }
        .configurationDisplayName("My Playlists")
        .description("Quick access to your playlists.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
