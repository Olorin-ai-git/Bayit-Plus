import BayitCore
import Foundation

/// Registry of bilingual voice commands for Hebrew and English speech recognition.
///
/// Matches spoken transcripts against registered regex patterns to determine
/// the user's intent (playback, navigation, search, channel switching, etc.).
final class VoiceCommandRegistry: @unchecked Sendable {

    static let shared = VoiceCommandRegistry()

    // MARK: - Types

    enum VoiceIntentType: String, Sendable {
        case playback
        case navigation
        case search
        case channel
        case dubbing
        case subtitle
        case settings
    }

    struct VoiceCommand: @unchecked Sendable {
        let pattern: Regex<AnyRegexOutput>
        let intentType: VoiceIntentType
        let actionType: String
        let languages: [String]
    }

    // MARK: - State

    private let logger = BayitLogger(category: "VoiceCommandRegistry")
    private let lock = NSLock()
    private var commands: [VoiceCommand] = []

    // MARK: - Init

    private init() {
        registerBuiltInCommands()
    }

    // MARK: - Public

    /// Matches a transcript against registered commands for the given language.
    /// Returns the first matching command, or nil if no match is found.
    func match(transcript: String, language: String) -> VoiceCommand? {
        let normalized = transcript.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return nil }

        lock.lock()
        let snapshot = commands
        lock.unlock()

        let filtered = snapshot.filter { $0.languages.contains(language) }

        for command in filtered {
            if normalized.contains(command.pattern) {
                logger.debug("Matched command", context: [
                    "intent": command.intentType.rawValue,
                    "action": command.actionType,
                    "language": language,
                ])
                return command
            }
        }

        return nil
    }

    /// Registers a custom voice command at runtime.
    func register(_ command: VoiceCommand) {
        lock.lock()
        commands.append(command)
        lock.unlock()
        logger.info("Registered command", context: [
            "intent": command.intentType.rawValue,
            "action": command.actionType,
        ])
    }

    // MARK: - Built-In Commands

    private func registerBuiltInCommands() {
        registerPlaybackCommands()
        registerNavigationCommands()
        registerSearchCommands()
        registerChannelCommands()
    }

    private func registerPlaybackCommands() {
        let pairs: [(String, String)] = [
            (#"(?:play|resume|start)"#, "play"),
            (#"(?:pause)"#, "pause"),
            (#"(?:stop)"#, "stop"),
            (#"(?:rewind|go back)"#, "rewind"),
        ]
        for (pattern, action) in pairs {
            addCommand(pattern: pattern, intent: .playback, action: action, languages: ["en"])
        }

        let hebrewPairs: [(String, String)] = [
            (#"(?:\u{05E9}\u{05D7}\u{05E7}|\u{05E0}\u{05D2}\u{05DF})"#, "play"),
            (#"(?:\u{05E2}\u{05E6}\u{05D5}\u{05E8})"#, "stop"),
            (#"(?:\u{05D0}\u{05D7}\u{05D5}\u{05E8}\u{05D4})"#, "rewind"),
        ]
        for (pattern, action) in hebrewPairs {
            addCommand(pattern: pattern, intent: .playback, action: action, languages: ["he"])
        }
    }

    private func registerNavigationCommands() {
        let pairs: [(String, String)] = [
            (#"(?:go home|home screen)"#, "home"),
            (#"(?:open search|search)"#, "search"),
            (#"(?:settings|open settings)"#, "settings"),
        ]
        for (pattern, action) in pairs {
            addCommand(pattern: pattern, intent: .navigation, action: action, languages: ["en"])
        }

        let hebrewPairs: [(String, String)] = [
            (#"(?:\u{05D1}\u{05D9}\u{05EA})"#, "home"),
            (#"(?:\u{05D7}\u{05D9}\u{05E4}\u{05D5}\u{05E9})"#, "search"),
            (#"(?:\u{05D4}\u{05D2}\u{05D3}\u{05E8}\u{05D5}\u{05EA})"#, "settings"),
        ]
        for (pattern, action) in hebrewPairs {
            addCommand(pattern: pattern, intent: .navigation, action: action, languages: ["he"])
        }
    }

    private func registerSearchCommands() {
        addCommand(
            pattern: #"(?:search for|find|look for)\s+.+"#,
            intent: .search,
            action: "search_query",
            languages: ["en"]
        )
        addCommand(
            pattern: #"(?:\u{05D7}\u{05E4}\u{05E9}|\u{05DE}\u{05E6}\u{05D0})\s+.+"#,
            intent: .search,
            action: "search_query",
            languages: ["he"]
        )
    }

    private func registerChannelCommands() {
        addCommand(
            pattern: #"(?:play channel|switch to channel|tune to)\s+.+"#,
            intent: .channel,
            action: "switch_channel",
            languages: ["en"]
        )
        addCommand(
            pattern: #"(?:\u{05E2}\u{05E8}\u{05D5}\u{05E5}|\u{05E6}\u{05E4}\u{05D4} \u{05D1})\s+.+"#,
            intent: .channel,
            action: "switch_channel",
            languages: ["he"]
        )
    }

    private func addCommand(
        pattern: String,
        intent: VoiceIntentType,
        action: String,
        languages: [String]
    ) {
        guard let regex = try? Regex(pattern).ignoresCase() else {
            logger.error("Invalid regex pattern", context: ["pattern": pattern])
            return
        }
        let command = VoiceCommand(
            pattern: regex,
            intentType: intent,
            actionType: action,
            languages: languages
        )
        commands.append(command)
    }
}
