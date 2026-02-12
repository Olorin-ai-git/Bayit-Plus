import Foundation

// MARK: - Interactive Mission

struct InteractiveMission: Decodable, Sendable, Identifiable {
    let missionId: String
    let title: String
    let titleHe: String
    let description: String
    let difficulty: String
    let status: String
    let progressPercent: Double
    let totalScenes: Int
    let decisionCount: Int
    let scenesCompleted: Int
    let totalScore: Double
    let shekelsEarned: Int
    let compositionVariant: String?
    let hlsBasePath: String?
    let thumbnailUrl: String?
    let scenes: [Scene]
    let createdAt: Date

    var id: String { missionId }
    var videoUrl: String { hlsBasePath ?? "" }

    struct Scene: Decodable, Sendable, Identifiable {
        let sceneNumber: Int
        let targetPhrase: String
        let decisionPoint: Double
        let decision: MissionDecision?

        var id: Int { sceneNumber }
    }
}

// MARK: - Mission Decision

struct MissionDecision: Decodable, Sendable {
    let promptText: String
    let promptTransliteration: String
    let expectedResponses: [String]
    let maxAttempts: Int?
}

// MARK: - Attempt Result

struct AttemptResult: Decodable, Sendable {
    let success: Bool
    let quality: String
    let score: Double
    let feedback: String
    let feedbackHe: String
    let nextScene: Int?
    let hint: String
    let attemptNumber: Int
    let shekelsEarned: Int
}

// MARK: - Mission Completion

struct MissionCompletion: Decodable, Sendable {
    let missionId: String
    let status: String
    let shekelsEarned: Int
    let totalScore: Double

    var earnedShekels: Int { shekelsEarned }
    var finalScore: Double { totalScore }
}

// MARK: - Outfit

struct Outfit: Decodable, Sendable, Identifiable {
    let id: String
    let nameKey: String
    let category: String
    let rarity: String
    let thumbnailUrl: String
    let priceShekel: Int
}

// MARK: - Family Snap

struct FamilySnap: Decodable, Sendable, Identifiable {
    let id: String
    let templateNameKey: String
    let imageUrl: String
    let thumbnailUrl: String
    let characterNames: [String]
    let createdAt: Date
}

// MARK: - API Request Types

struct SubmitAttemptRequest: Encodable {
    let profileId: String
    let responseTranscript: String
    let languageDetected: String
}

struct CompleteMissionRequest: Encodable {
    let profileId: String
}
