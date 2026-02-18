#if os(tvOS)
import BayitCore
import BayitVoice
import Foundation

/// Registry of bilingual (Hebrew/English) voice commands for Apple TV.
///
/// Matches spoken transcripts against regex patterns to determine user intent
/// for navigation, playback, voice control, and search interactions.
@MainActor
@Observable
final class TVVoiceCommandRegistry {

    // MARK: - Types

    struct VoiceCommand: @unchecked Sendable {
        let pattern: Regex<AnyRegexOutput>
        let intentType: VoiceIntentType
        let actionType: String
        let languages: [String]
    }

    // MARK: - State

    private let logger = BayitLogger(category: "TVVoiceCommandRegistry")
    private var commands: [VoiceCommand] = []

    // MARK: - Init

    init() {
        registerBuiltInCommands()
    }

    // MARK: - Public

    /// Matches a transcript against registered commands for the given language.
    func matchCommand(_ transcript: String, language: String) -> VoiceIntentType? {
        let normalized = transcript.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return nil }

        let filtered = commands.filter { $0.languages.contains(language) }

        for command in filtered {
            if normalized.contains(command.pattern) {
                logger.debug("Matched command", context: [
                    "intent": command.intentType.rawValue,
                    "action": command.actionType,
                    "language": language,
                ])
                return command.intentType
            }
        }

        return nil
    }

    /// Returns the full matched command with action details.
    func matchFullCommand(_ transcript: String, language: String) -> VoiceCommand? {
        let normalized = transcript.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return nil }

        let filtered = commands.filter { $0.languages.contains(language) }
        return filtered.first { normalized.contains($0.pattern) }
    }

    /// Registers a custom voice command at runtime.
    func register(_ command: VoiceCommand) {
        commands.append(command)
        logger.info("Registered command", context: [
            "intent": command.intentType.rawValue,
            "action": command.actionType,
        ])
    }

    // MARK: - Built-In Commands

    private func registerBuiltInCommands() {
        registerNavigationCommands()
        registerPlaybackCommands()
        registerVoiceCommands()
        registerSearchCommands()
    }

    private func registerNavigationCommands() {
        let english: [(String, String)] = [
            (#"(?:go home|home screen|go to home)"#, "home"),
            (#"(?:open settings|go to settings)"#, "settings"),
            (#"(?:go back|back)"#, "back"),
        ]
        for (pattern, action) in english {
            addCommand(pattern: pattern, intent: .navigation, action: action, languages: ["en"])
        }

        let hebrew: [(String, String)] = [
            (#"(?:\u{05D1}\u{05D9}\u{05EA}|\u{05DE}\u{05E1}\u{05DA} \u{05E8}\u{05D0}\u{05E9}\u{05D9})"#, "home"),
            (#"(?:\u{05D4}\u{05D2}\u{05D3}\u{05E8}\u{05D5}\u{05EA})"#, "settings"),
            (#"(?:\u{05D7}\u{05D6}\u{05D5}\u{05E8}|\u{05D0}\u{05D7}\u{05D5}\u{05E8}\u{05D4})"#, "back"),
        ]
        for (pattern, action) in hebrew {
            addCommand(pattern: pattern, intent: .navigation, action: action, languages: ["he"])
        }
    }

    private func registerPlaybackCommands() {
        let english: [(String, String)] = [
            (#"(?:play|resume|start)"#, "play"),
            (#"(?:pause)"#, "pause"),
            (#"(?:stop)"#, "stop"),
            (#"(?:next episode|skip|next)"#, "next"),
            (#"(?:rewind|go back)"#, "rewind"),
        ]
        for (pattern, action) in english {
            addCommand(pattern: pattern, intent: .playback, action: action, languages: ["en"])
        }

        let hebrew: [(String, String)] = [
            (#"(?:\u{05E9}\u{05D7}\u{05E7}|\u{05E0}\u{05D2}\u{05DF})"#, "play"),
            (#"(?:\u{05D4}\u{05E9}\u{05D4}\u{05D4})"#, "pause"),
            (#"(?:\u{05E2}\u{05E6}\u{05D5}\u{05E8})"#, "stop"),
            (#"(?:\u{05D4}\u{05E4}\u{05E8}\u{05E7} \u{05D4}\u{05D1}\u{05D0}|\u{05D4}\u{05D1}\u{05D0})"#, "next"),
            (#"(?:\u{05D0}\u{05D7}\u{05D5}\u{05E8}\u{05D4})"#, "rewind"),
        ]
        for (pattern, action) in hebrew {
            addCommand(pattern: pattern, intent: .playback, action: action, languages: ["he"])
        }
    }

    private func registerVoiceCommands() {
        let english: [(String, String)] = [
            (#"(?:stop listening|quiet|be quiet)"#, "stop_listening"),
            (#"(?:repeat|say that again|what did you say)"#, "repeat"),
        ]
        for (pattern, action) in english {
            addCommand(pattern: pattern, intent: .chat, action: action, languages: ["en"])
        }

        let hebrew: [(String, String)] = [
            (#"(?:\u{05EA}\u{05E4}\u{05E1}\u{05D9}\u{05E7} \u{05DC}\u{05D4}\u{05D0}\u{05D6}\u{05D9}\u{05DF}|\u{05E9}\u{05E7}\u{05D8})"#, "stop_listening"),
            (#"(?:\u{05D7}\u{05D6}\u{05D5}\u{05E8}|\u{05DE}\u{05D4} \u{05D0}\u{05DE}\u{05E8}\u{05EA})"#, "repeat"),
        ]
        for (pattern, action) in hebrew {
            addCommand(pattern: pattern, intent: .chat, action: action, languages: ["he"])
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

    // MARK: - Helpers

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
        commands.append(VoiceCommand(
            pattern: regex,
            intentType: intent,
            actionType: action,
            languages: languages
        ))
    }
}
#endif
