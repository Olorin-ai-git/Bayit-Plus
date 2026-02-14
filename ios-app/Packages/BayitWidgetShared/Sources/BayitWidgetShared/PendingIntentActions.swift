import Foundation

/// Centralized constants for pending intent action types.
/// Ensures consistency between widget intents and main app handler.
public enum PendingIntentActions {

    /// Toggle play/pause for current content.
    public static let togglePlayPause = "togglePlayPause"

    /// Resume watching specific content from Continue Watching widget.
    public static let resumeContent = "resumeContent"

    /// Switch to a different live TV channel.
    public static let switchChannel = "switchChannel"

    /// Play a specific playlist.
    public static let playPlaylist = "playPlaylist"

    /// Shuffle and play a playlist.
    public static let shufflePlaylist = "shufflePlaylist"

    /// All allowed actions for validation.
    public static let allActions: Set<String> = [
        togglePlayPause,
        resumeContent,
        switchChannel,
        playPlaylist,
        shufflePlaylist
    ]
}
