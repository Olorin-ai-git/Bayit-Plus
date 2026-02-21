import Foundation

// MARK: - Supporting Types

extension SubtitleHebrewMode {
    var asGeneratable: GeneratableHebrewMode? {
        switch self {
        case .nikud: return .nikud
        case .shoresh: return .shoresh
        case .heblish: return .heblish
        case .standard: return nil
        }
    }
}

enum GeneratableHebrewMode: String {
    case nikud
    case shoresh
    case heblish
}

struct HebrewModeOption {
    let mode: SubtitleHebrewMode
    let iconName: String
    let title: String
    let description: String
    let example: String
    let isAI: Bool
}
