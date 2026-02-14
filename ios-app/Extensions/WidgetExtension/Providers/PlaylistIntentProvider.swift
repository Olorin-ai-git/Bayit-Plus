import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Intent-based timeline provider for the configurable Playlist widget.
/// Reads the selected playlist from the intent configuration and provides timeline entries.
@available(iOS 17.0, *)
struct PlaylistIntentProvider: IntentTimelineProvider {
    typealias Intent = SelectPlaylistIntent
    typealias Entry = PlaylistIntentEntry

    private let logger = BayitLogger(category: "PlaylistIntentProvider")
    private static let refreshIntervalMinutes: TimeInterval = 15

    func placeholder(in context: Context) -> PlaylistIntentEntry {
        PlaylistIntentEntry.placeholder
    }

    func getSnapshot(
        for configuration: SelectPlaylistIntent,
        in context: Context,
        completion: @escaping @Sendable (PlaylistIntentEntry) -> Void
    ) {
        Task { @Sendable in
            let playlists = await WidgetDataStore.shared.readPlaylists()
            let isAuthenticated = SharedKeychainHelper().readAuthToken() != nil
            let selectedPlaylist = findSelectedPlaylist(
                playlistID: configuration.playlist?.id,
                allPlaylists: playlists
            )

            completion(PlaylistIntentEntry(
                date: .now,
                playlist: selectedPlaylist,
                isAuthenticated: isAuthenticated,
                configuration: configuration
            ))
        }
    }

    func getTimeline(
        for configuration: SelectPlaylistIntent,
        in context: Context,
        completion: @escaping @Sendable (Timeline<PlaylistIntentEntry>) -> Void
    ) {
        Task { @Sendable in
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
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }

    /// Finds the selected playlist from the configuration in the list of available playlists.
    private func findSelectedPlaylist(
        playlistID: String?,
        allPlaylists: [SharedPlaylistItem]
    ) -> SharedPlaylistItem? {
        guard let playlistID = playlistID else {
            // No selection - return first playlist or nil
            return allPlaylists.first
        }

        return allPlaylists.first { $0.id == playlistID }
    }
}

/// Timeline entry for the intent-based Playlist widget.
/// Contains the selected playlist and authentication state.
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
