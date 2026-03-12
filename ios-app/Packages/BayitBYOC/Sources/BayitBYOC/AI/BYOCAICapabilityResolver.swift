import Foundation

/// Resolves which AI features are available for a given stream.
/// Checks whether the URL belongs to a BYOC source and returns
/// the appropriate capability set.
@MainActor
public enum BYOCAICapabilityResolver {
    /// Resolve capabilities for a stream URL using the source manager.
    public static func resolve(
        streamURL: URL?,
        manager: BYOCSourceManager
    ) -> BYOCCapabilities {
        guard let url = streamURL else { return .none }
        return manager.capabilities(for: url)
    }

    /// Check if dubbing is available for a stream.
    public static func isDubbingAvailable(
        streamURL: URL?,
        manager: BYOCSourceManager
    ) -> Bool {
        guard let url = streamURL else { return false }
        return manager.capabilities(for: url).dubbing
    }

    /// Check if live subtitles are available for a stream.
    public static func areLiveSubtitlesAvailable(
        streamURL: URL?,
        manager: BYOCSourceManager
    ) -> Bool {
        guard let url = streamURL else { return false }
        return manager.capabilities(for: url).liveSubtitles
    }

    /// Check if trivia is available for a stream.
    public static func isTriviaAvailable(
        streamURL: URL?,
        manager: BYOCSourceManager
    ) -> Bool {
        guard let url = streamURL else { return false }
        return manager.capabilities(for: url).trivia
    }

    /// Check if only audio overlay AI is available (YouTube).
    public static func isAudioOverlayOnly(
        streamURL: URL?,
        manager: BYOCSourceManager
    ) -> Bool {
        guard let url = streamURL else { return false }
        return manager.capabilities(for: url).audioOverlayOnly
    }

    /// Get a display-friendly list of available features.
    public static func availableFeatureNames(
        capabilities: BYOCCapabilities
    ) -> [String] {
        var names: [String] = []
        if capabilities.dubbing { names.append("dubbing") }
        if capabilities.liveSubtitles { names.append("liveSubtitles") }
        if capabilities.interactiveSubtitles { names.append("interactiveSubtitles") }
        if capabilities.trivia { names.append("trivia") }
        if capabilities.audioOverlayOnly { names.append("audioOverlay") }
        return names
    }
}
