import SwiftUI

// MARK: - Picker Item Model

struct SubtitlePickerItem: Identifiable {
    let languageInfo: SubtitleLanguageInfo
    let hebrewMode: SubtitleHebrewMode?
    let englishMode: SubtitleEnglishMode?

    var id: String {
        var key = languageInfo.code
        if let hm = hebrewMode { key += "_\(hm.rawValue)" }
        if let em = englishMode { key += "_\(em.rawValue)" }
        return key
    }

    var isAI: Bool {
        if let hm = hebrewMode, hm != .standard { return true }
        if let em = englishMode, em != .standard { return true }
        return false
    }

    var displayLabel: String {
        if let hm = hebrewMode, hm != .standard {
            return "\(languageInfo.nativeName) (\(hm.displayName))"
        }
        if let em = englishMode, em != .standard {
            return "\(languageInfo.nativeName) (\(em.displayName))"
        }
        return languageInfo.nativeName
    }

    var secondaryLabel: String {
        if let hm = hebrewMode, hm != .standard {
            return hm.description
        }
        if let em = englishMode, em != .standard {
            return em.description
        }
        return languageInfo.name
    }
}
