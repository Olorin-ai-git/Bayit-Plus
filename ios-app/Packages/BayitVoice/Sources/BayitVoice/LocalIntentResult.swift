import Foundation

/// Result from on-device intent classification.
/// Used for fast-path commands that don't need server round-trip.
public struct LocalIntentResult: Sendable, Equatable {
    public let intent: VoiceIntentType
    public let confidence: Double
    public let action: VoiceAction
    public let spokenResponse: String

    public init(
        intent: VoiceIntentType,
        confidence: Double,
        action: VoiceAction,
        spokenResponse: String
    ) {
        self.intent = intent
        self.confidence = confidence
        self.action = action
        self.spokenResponse = spokenResponse
    }
}
