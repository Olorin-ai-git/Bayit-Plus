import Foundation

/// The 7 VOD AI features available for BYOC and native content.
enum VODAIFeature: String, CaseIterable, Identifiable, Sendable {
    case pauseAsk
    case interactiveSubtitles
    case vocabulary
    case vodMoments
    case culturalContext
    case bilingualBridge
    case aiCompanion

    var id: String {
        rawValue
    }

    var icon: String {
        switch self {
        case .pauseAsk: "bubble.left.and.text.bubble.right"
        case .interactiveSubtitles: "captions.bubble.fill"
        case .vocabulary: "character.book.closed"
        case .vodMoments: "sparkles.rectangle.stack"
        case .culturalContext: "globe"
        case .bilingualBridge: "rectangle.split.2x1"
        case .aiCompanion: "person.crop.circle.badge.questionmark"
        }
    }

    var nameKey: String {
        switch self {
        case .pauseAsk: "byoc.ai.feature.pauseAsk.name"
        case .interactiveSubtitles: "byoc.ai.feature.interactiveSubtitles.name"
        case .vocabulary: "byoc.ai.feature.vocabulary.name"
        case .vodMoments: "byoc.ai.feature.vodMoments.name"
        case .culturalContext: "byoc.ai.feature.culturalContext.name"
        case .bilingualBridge: "byoc.ai.feature.bilingualBridge.name"
        case .aiCompanion: "byoc.ai.feature.aiCompanion.name"
        }
    }

    var descriptionKey: String {
        switch self {
        case .pauseAsk: "byoc.ai.feature.pauseAsk.description"
        case .interactiveSubtitles: "byoc.ai.feature.interactiveSubtitles.description"
        case .vocabulary: "byoc.ai.feature.vocabulary.description"
        case .vodMoments: "byoc.ai.feature.vodMoments.description"
        case .culturalContext: "byoc.ai.feature.culturalContext.description"
        case .bilingualBridge: "byoc.ai.feature.bilingualBridge.description"
        case .aiCompanion: "byoc.ai.feature.aiCompanion.description"
        }
    }
}
