import Foundation

/// Chat message in a chess game. Maps to backend `ChessChatMessage` document.
/// All decoders (APIClient, WebSocketDecoder) use `.convertFromSnakeCase`,
/// so no explicit CodingKeys needed.
struct ChessChatMessage: Codable, Identifiable, Sendable {
    let id: String
    let gameId: String
    let userId: String
    let userName: String
    let message: String
    let displayMessage: String
    let isTranslated: Bool
    let translationAvailable: Bool
    let isBotRequest: Bool
    let botResponse: String?
    let sourceLanguage: String
    let timestamp: Date

    var isBot: Bool {
        userId == "BOT"
    }

    var isSystem: Bool {
        userId == "SYSTEM"
    }
}
