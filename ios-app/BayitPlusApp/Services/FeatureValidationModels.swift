import Foundation

// MARK: - Feature Validation Types

extension FeatureValidationService {
    enum FeatureName: String, Codable {
        case beta500 = "beta_500"
        case familyControls = "family_controls"
        case liveDubbing = "live_dubbing"
        case audiobooks
        case llmSearch = "llm_search"
        case rewards
        case household
        case carPlay = "carplay"
        case avatarMode = "avatar_mode"
        case proactiveVoice = "proactive_voice"
        case devicePairing = "device_pairing"
        case trivia
        case wakeWord = "wake_word"
        case legacyFeatures = "legacy_features"
        case chapterNavigation = "chapter_navigation"
        case interactiveSubtitles = "interactive_subtitles"
        case shabbatMode = "shabbat_mode"
    }

    struct ValidationResult: Codable {
        let feature: String
        let enabled: Bool
        let reason: String?
        let metadata: [String: AnyCodable]?
    }

    struct BatchValidationRequest: Codable {
        let features: [FeatureName]
    }

    struct BatchValidationResponse: Codable {
        let results: [ValidationResult]
    }

    struct DeductCreditRequest: Codable {
        let feature: String
    }

    struct DeductCreditResponse: Codable {
        let success: Bool
        let remainingCredits: Int
        let message: String

        enum CodingKeys: String, CodingKey {
            case success
            case remainingCredits = "remaining_credits"
            case message
        }
    }
}

// MARK: - Helper Types

struct EmptyBody: Codable {}

/// Type-erased codable value for flexible metadata
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let bool as Bool:
            try container.encode(bool)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }
}
