import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore
import AppIntents

/// Timeline provider for the Playlist widget.
/// Reads playlists from shared data. Auth required.
struct PlaylistTimelineProvider: TimelineProvider {

    private let logger = BayitLogger(category: "PlaylistWidget")
    private static let refreshIntervalMinutes: TimeInterval = 15

    func placeholder(in context: Context) -> PlaylistEntry {
        PlaylistEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (PlaylistEntry) -> Void) {
        Task { @Sendable in
            let playlists = await WidgetDataStore.shared.readPlaylists()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            completion(PlaylistEntry(
                date: .now,
                playlists: playlists,
                isAuthenticated: isAuthenticated
            ))
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<PlaylistEntry>) -> Void) {
        Task { @Sendable in
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

// MARK: - Configurable Playlist Widget (iOS 17+)

/// App Intent that allows users to select a playlist during widget configuration.
@available(iOS 17.0, *)
struct SelectPlaylistIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Playlist"
    static var description = IntentDescription("Choose which playlist to display in the widget.")

    @Parameter(title: "Playlist")
    var playlist: PlaylistEntity?

    var playlistID: String? {
        playlist?.id
    }

    var playlistName: String? {
        playlist?.name
    }
}

/// Entity representing a playlist selection option.
@available(iOS 17.0, *)
struct PlaylistEntity: AppEntity {
    let id: String
    let name: String
    let itemCount: Int

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Playlist"
    static var defaultQuery = PlaylistEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(itemCount) items"
        )
    }
}

/// Query provider for playlist entities.
@available(iOS 17.0, *)
struct PlaylistEntityQuery: EntityQuery {
    private let logger = BayitLogger(category: "PlaylistEntityQuery")

    func entities(for identifiers: [String]) async throws -> [PlaylistEntity] {
        let playlists = await WidgetDataStore.shared.readPlaylists()
        return playlists
            .filter { identifiers.contains($0.id) }
            .map { playlist in
                PlaylistEntity(
                    id: playlist.id,
                    name: playlist.name,
                    itemCount: playlist.itemCount
                )
            }
    }

    func suggestedEntities() async throws -> [PlaylistEntity] {
        let playlists = await WidgetDataStore.shared.readPlaylists()

        if playlists.isEmpty {
            logger.warning("No playlists available for suggestions")
            return []
        }

        logger.info("Providing \(playlists.count) playlist suggestions")

        return playlists.map { playlist in
            PlaylistEntity(
                id: playlist.id,
                name: playlist.name,
                itemCount: playlist.itemCount
            )
        }
    }

    func defaultResult() async -> PlaylistEntity? {
        guard let first = await WidgetDataStore.shared.readPlaylists().first else {
            return nil
        }
        return PlaylistEntity(
            id: first.id,
            name: first.name,
            itemCount: first.itemCount
        )
    }
}

/// Intent-based timeline provider for the configurable Playlist widget.
@available(iOS 17.0, *)
struct PlaylistIntentProvider: AppIntentTimelineProvider {
    typealias Intent = SelectPlaylistIntent
    typealias Entry = PlaylistIntentEntry

    private let logger = BayitLogger(category: "PlaylistIntentProvider")
    private static let refreshIntervalMinutes: TimeInterval = 15

    func placeholder(in context: Context) -> PlaylistIntentEntry {
        PlaylistIntentEntry.placeholder
    }

    func snapshot(
        for configuration: SelectPlaylistIntent,
        in context: Context
    ) async -> PlaylistIntentEntry {
        let playlists = await WidgetDataStore.shared.readPlaylists()
        let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
        let selectedPlaylist = findSelectedPlaylist(
            playlistID: configuration.playlist?.id,
            allPlaylists: playlists
        )

        return PlaylistIntentEntry(
            date: .now,
            playlist: selectedPlaylist,
            isAuthenticated: isAuthenticated,
            configuration: configuration
        )
    }

    func timeline(
        for configuration: SelectPlaylistIntent,
        in context: Context
    ) async -> Timeline<PlaylistIntentEntry> {
        let playlists = await WidgetDataStore.shared.readPlaylists()
        let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil

        logger.debug(
            "Building timeline for playlist widget",
            context: [
                "selectedID": configuration.playlistID ?? "none",
                "availablePlaylists": String(playlists.count)
            ]
        )

        let selectedPlaylist = findSelectedPlaylist(
            playlistID: configuration.playlist?.id,
            allPlaylists: playlists
        )

        if selectedPlaylist == nil && isAuthenticated {
            logger.warning("Selected playlist not found in available playlists")
        }

        let entry = PlaylistIntentEntry(
            date: .now,
            playlist: selectedPlaylist,
            isAuthenticated: isAuthenticated,
            configuration: configuration
        )

        let refreshDate = Date().addingTimeInterval(Self.refreshIntervalMinutes * 60)
        return Timeline(entries: [entry], policy: .after(refreshDate))
    }

    private func findSelectedPlaylist(
        playlistID: String?,
        allPlaylists: [SharedPlaylistItem]
    ) -> SharedPlaylistItem? {
        guard let playlistID = playlistID else {
            return allPlaylists.first
        }

        return allPlaylists.first { $0.id == playlistID }
    }
}

/// Timeline entry for the intent-based Playlist widget.
@available(iOS 17.0, *)
struct PlaylistIntentEntry: TimelineEntry {
    let date: Date
    let playlist: SharedPlaylistItem?
    let isAuthenticated: Bool
    let configuration: SelectPlaylistIntent

    static let placeholder = PlaylistIntentEntry(
        date: .now,
        playlist: SharedPlaylistItem(
            id: "placeholder",
            name: "My Playlist",
            itemCount: 12,
            thumbnailURL: nil
        ),
        isAuthenticated: true,
        configuration: SelectPlaylistIntent()
    )
}

/// Configurable Playlist widget that allows users to select which playlist to display.
@available(iOS 17.0, *)
struct ConfigurablePlaylistWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.configurablePlaylist

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectPlaylistIntent.self,
            provider: PlaylistIntentProvider()
        ) { entry in
            PlaylistIntentView(entry: entry)
        }
        .configurationDisplayName("My Playlist")
        .description("Choose a playlist to display and control.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
