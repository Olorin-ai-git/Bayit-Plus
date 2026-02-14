import Foundation

/// Localized strings for widget UI.
/// Centralized location for all user-facing text in widgets.
enum WidgetStrings {

    // MARK: - Now Playing Widget

    static let nowPlayingTitle = NSLocalizedString(
        "widget.nowPlaying.title",
        value: "Now Playing",
        comment: "Now Playing widget title"
    )

    static let nowPlayingDescription = NSLocalizedString(
        "widget.nowPlaying.description",
        value: "See what is currently playing on Bayit+.",
        comment: "Now Playing widget description"
    )

    static let nothingPlaying = NSLocalizedString(
        "widget.nowPlaying.empty.title",
        value: "Nothing Playing",
        comment: "Empty state when nothing is playing"
    )

    static let tapToOpen = NSLocalizedString(
        "widget.nowPlaying.empty.action",
        value: "Tap to open Bayit+",
        comment: "Action hint for empty state"
    )

    static let live = NSLocalizedString(
        "widget.live.badge",
        value: "LIVE",
        comment: "Live indicator badge"
    )

    static let next = NSLocalizedString(
        "widget.nowPlaying.next",
        value: "Next:",
        comment: "Label for next show"
    )

    // MARK: - Playlist Widget

    static let playlistTitle = NSLocalizedString(
        "widget.playlist.title",
        value: "My Playlist",
        comment: "Playlist widget title"
    )

    static let playlistDescription = NSLocalizedString(
        "widget.playlist.description",
        value: "Choose a playlist to display and control.",
        comment: "Playlist widget description"
    )

    static let playlistLabel = NSLocalizedString(
        "widget.playlist.label",
        value: "Playlist",
        comment: "Generic playlist label"
    )

    static let noPlaylistsTitle = NSLocalizedString(
        "widget.playlist.empty.title",
        value: "No playlists",
        comment: "Empty state title when no playlists"
    )

    static let noPlaylistSelected = NSLocalizedString(
        "widget.playlist.notSelected.title",
        value: "No playlist selected",
        comment: "Title when user hasn't selected a playlist"
    )

    static let longPressToSelect = NSLocalizedString(
        "widget.playlist.notSelected.hint",
        value: "Long-press widget to select a playlist",
        comment: "Hint on how to configure widget"
    )

    static let createPlaylists = NSLocalizedString(
        "widget.playlist.empty.message",
        value: "Create playlists to see them here",
        comment: "Message when user has no playlists"
    )

    static let play = NSLocalizedString(
        "widget.action.play",
        value: "Play",
        comment: "Play button label"
    )

    static let pause = NSLocalizedString(
        "widget.action.pause",
        value: "Pause",
        comment: "Pause button label"
    )

    static let shuffle = NSLocalizedString(
        "widget.action.shuffle",
        value: "Shuffle",
        comment: "Shuffle button label"
    )

    static func trackCount(_ count: Int) -> String {
        String.localizedStringWithFormat(
            NSLocalizedString(
                "widget.playlist.trackCount",
                value: "%d track(s)",
                comment: "Number of tracks in playlist"
            ),
            count
        )
    }

    // MARK: - Authentication

    static let signInRequired = NSLocalizedString(
        "widget.auth.required.title",
        value: "Sign in to access playlists",
        comment: "Message when user is not authenticated"
    )

    static let signInHint = NSLocalizedString(
        "widget.auth.required.hint",
        value: "Double tap to open Bayit+ and sign in",
        comment: "Accessibility hint for sign in action"
    )

    // MARK: - Accessibility

    static let playlistArtwork = NSLocalizedString(
        "widget.accessibility.playlistArtwork",
        value: "Playlist artwork",
        comment: "Accessibility label for playlist thumbnail"
    )

    static let tapToOpenPlaylist = NSLocalizedString(
        "widget.accessibility.openPlaylist",
        value: "Tap to open playlist",
        comment: "Accessibility hint for playlist link"
    )

    static func playlistName(_ name: String) -> String {
        String(format: NSLocalizedString(
            "widget.accessibility.playlistName",
            value: "Playlist name: %@",
            comment: "Accessibility label with playlist name"
        ), name)
    }

    static func trackCountAccessibility(_ count: Int) -> String {
        String.localizedStringWithFormat(
            NSLocalizedString(
                "widget.accessibility.trackCount",
                value: "%d track(s)",
                comment: "Accessibility label for track count"
            ),
            count
        )
    }

    static let togglePlayback = NSLocalizedString(
        "widget.accessibility.togglePlayback",
        value: "Toggles playback",
        comment: "Accessibility hint for play/pause button"
    )

    static func togglesPlaybackOf(_ channelName: String) -> String {
        String(format: NSLocalizedString(
            "widget.accessibility.togglesPlaybackOfChannel",
            value: "Toggles playback of %@",
            comment: "Accessibility hint with channel name"
        ), channelName)
    }

    static func nowPlaying(_ showTitle: String) -> String {
        String(format: NSLocalizedString(
            "widget.accessibility.nowPlaying",
            value: "Now playing: %@",
            comment: "Accessibility label with show title"
        ), showTitle)
    }

    static func onChannel(_ channelName: String) -> String {
        String(format: NSLocalizedString(
            "widget.accessibility.onChannel",
            value: "On %@",
            comment: "Accessibility label with channel name"
        ), channelName)
    }
}
