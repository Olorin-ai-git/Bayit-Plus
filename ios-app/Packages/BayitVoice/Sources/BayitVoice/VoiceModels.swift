import Foundation

// MARK: - Voice Pipeline State

/// State machine states for the voice interaction pipeline.
/// Mirrors olorinVoiceOrchestrator.ts state transitions:
/// idle -> listening -> processing -> speaking -> idle (with error recovery)
public enum VoiceState: String, Sendable, Equatable {
    case idle
    case listening
    case processing
    case speaking
    case error
}

/// What triggered the voice interaction
public enum VoiceTrigger: String, Sendable, Codable {
    case manual
    case wakeWord = "wake-word"
}

// MARK: - Intent Models

/// Intent types recognized by the backend voice/unified endpoint.
/// Matches backend/app/services/voice/models.py
public enum VoiceIntentType: String, Sendable, Codable {
    case chat = "CHAT"
    case search = "SEARCH"
    case navigation = "NAVIGATION"
    case playlist = "PLAYLIST"
    case channel = "CHANNEL"
    case playback = "PLAYBACK"
    case dubbing = "DUBBING"
    case subtitle = "SUBTITLE"
    case settings = "SETTINGS"
    case widget = "WIDGET"
    case unknown = "UNKNOWN"

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = VoiceIntentType(rawValue: raw) ?? .unknown
    }
}

/// Action payload returned by the voice backend
public struct VoiceAction: Sendable, Codable, Equatable {
    public let type: String
    public let payload: [String: AnyCodable]?

    public init(type: String, payload: [String: AnyCodable]? = nil) {
        self.type = type
        self.payload = payload
    }
}

/// Gesture animation hint from the backend
public struct GestureState: Sendable, Codable, Equatable {
    public let gesture: String
    public let duration: Int?
}

/// Request to POST /api/v1/voice/unified
public struct VoiceRequest: Sendable, Encodable {
    public let transcript: String
    public let language: String
    public let conversationId: String?
    public let platform: String
    public let triggerType: String

    public init(
        transcript: String,
        language: String,
        conversationId: String? = nil,
        trigger: VoiceTrigger = .manual
    ) {
        self.transcript = transcript
        self.language = language
        self.conversationId = conversationId
        self.platform = "ios"
        self.triggerType = trigger.rawValue
    }
}

/// Response from POST /api/v1/voice/unified
public struct VoiceResponse: Sendable, Decodable {
    public let intent: VoiceIntentType
    public let spokenResponse: String?
    public let action: VoiceAction?
    public let conversationId: String?
    public let confidence: Double?
    public let gesture: GestureState?
}

// MARK: - WebSocket Message Types

/// Messages received from the voice WebSocket server.
/// Matches voiceWebSocketHandler.ts message types.
public enum VoiceWSIncoming: Sendable {
    case transcriptPartial(String)
    case transcriptFinal(String)
    case llmChunk(String)
    case ttsAudio(Data)
    case intentAction(VoiceIntentType, String, VoiceAction)
    case complete
    case cancelled
    case error(String)
    case pong
}

/// Messages sent to the voice WebSocket server
public enum VoiceWSOutgoing: Sendable {
    case audio(Data)
    case commit
    case cancel
    case ping
}

// MARK: - Speech Recognition Result

/// Result from on-device speech recognition
public struct SpeechResult: Sendable, Equatable {
    public let transcription: String
    public let isFinal: Bool
    public let confidence: Float

    public init(transcription: String, isFinal: Bool, confidence: Float) {
        self.transcription = transcription
        self.isFinal = isFinal
        self.confidence = confidence
    }
}

/// Permission status for voice features
public struct VoicePermissions: Sendable, Equatable {
    public let microphone: Bool
    public let speechRecognition: Bool

    public var allGranted: Bool { microphone && speechRecognition }

    public init(microphone: Bool, speechRecognition: Bool) {
        self.microphone = microphone
        self.speechRecognition = speechRecognition
    }
}

// MARK: - TTS Voice Info

/// Metadata about an available TTS voice
public struct TTSVoiceInfo: Sendable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let language: String
    public let quality: TTSVoiceQuality

    public init(id: String, name: String, language: String, quality: TTSVoiceQuality) {
        self.id = id
        self.name = name
        self.language = language
        self.quality = quality
    }
}

/// TTS voice quality tier
public enum TTSVoiceQuality: String, Sendable, Equatable {
    case standard = "default"
    case enhanced
    case premium
}

// MARK: - AnyCodable Helper

/// Type-erased Codable for dynamic JSON payloads
public struct AnyCodable: @unchecked Sendable, Codable, Equatable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else {
            value = ""
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let string = value as? String {
            try container.encode(string)
        } else if let int = value as? Int {
            try container.encode(int)
        } else if let double = value as? Double {
            try container.encode(double)
        } else if let bool = value as? Bool {
            try container.encode(bool)
        }
    }

    public static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        String(describing: lhs.value) == String(describing: rhs.value)
    }
}
