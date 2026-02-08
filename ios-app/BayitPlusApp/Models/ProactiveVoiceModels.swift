import Foundation

// MARK: - Proactive Voice Suggestions

/// A proactive suggestion from the AI assistant.
struct ProactiveSuggestion: Decodable, Sendable, Identifiable {
    let id: String
    let type: SuggestionType?
    let message: String?
    let action: SuggestionAction?
    let priority: SuggestionPriority?
    let timestamp: Double?
}

/// The trigger type for a proactive suggestion.
enum SuggestionType: String, Codable, Sendable {
    case timeBased = "time-based"
    case contextBased = "context-based"
    case presenceBased = "presence-based"
}

/// Priority level for a proactive suggestion.
enum SuggestionPriority: String, Codable, Sendable {
    case low
    case medium
    case high
}

/// An action attached to a proactive suggestion.
struct SuggestionAction: Decodable, Sendable {
    let type: ActionType?
    let payload: [String: String]?
}

/// The type of action a suggestion can trigger.
enum ActionType: String, Codable, Sendable {
    case navigate
    case widget
    case content
}
