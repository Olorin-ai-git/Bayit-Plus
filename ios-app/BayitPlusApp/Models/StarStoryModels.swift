import Foundation

// MARK: - Avatar

struct StarStoryAvatar: Codable, Sendable, Identifiable {
    let avatarId: String
    let childFirstName: String
    let style: AvatarStyle
    let status: String
    let primaryAvatarUrl: String?
    let posesCount: Int
    let createdAt: Date

    var id: String { avatarId }
}

enum AvatarStyle: String, Codable, Sendable, CaseIterable {
    case cartoon2d = "cartoon_2d"
    case pixar3d = "pixar_3d"

    var displayName: String {
        switch self {
        case .cartoon2d: return "Cartoon 2D"
        case .pixar3d: return "Pixar 3D"
        }
    }
}

// MARK: - Episode

struct StarStoryEpisode: Codable, Sendable, Identifiable {
    let episodeId: String
    let title: String
    let theme: String
    let episodeNumber: Int
    let status: String
    let hlsUrl: String?
    let thumbnailUrl: String?
    let durationSeconds: Int
    let createdAt: Date

    var id: String { episodeId }

    var formattedDuration: String {
        let mins = durationSeconds / 60
        let secs = durationSeconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

// MARK: - Generation Progress

struct StarStoryGenerationProgress: Codable, Sendable {
    let episodeId: String
    let status: String
    let currentStage: String
    let progressPercent: Double
    let errorMessage: String?
}

enum GenerationStage: String, CaseIterable, Sendable {
    case script
    case video
    case audio
    case assembly
    case safety

    var displayName: String {
        switch self {
        case .script: return "Writing Script"
        case .video: return "Generating Video"
        case .audio: return "Creating Audio"
        case .assembly: return "Assembling Episode"
        case .safety: return "Safety Review"
        }
    }

    var systemImage: String {
        switch self {
        case .script: return "doc.text"
        case .video: return "film"
        case .audio: return "mic.fill"
        case .assembly: return "square.stack.3d.up"
        case .safety: return "checkmark.shield"
        }
    }
}

// MARK: - API Requests / Responses

struct ConsentRequest: Encodable {
    let profileId: String
    let childFirstName: String
    let pinHash: String
}

struct ConsentResponse: Decodable {
    let success: Bool
}

struct GenerateEpisodeRequest: Encodable {
    let profileId: String
    let avatarId: String
    let theme: String
    let targetVocabulary: [String]
}

struct GenerateEpisodeResponse: Decodable {
    let episodeId: String
}

struct AvatarsResponse: Decodable {
    let avatars: [StarStoryAvatar]
}

struct EpisodesResponse: Decodable {
    let episodes: [StarStoryEpisode]
}
