import BayitDesignSystem
import SwiftUI

// MARK: - SubtitleLanguagePickerView Picker Items & Helpers

extension SubtitleLanguagePickerView {
    struct PickerItem: Identifiable {
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

    var pickerItems: [PickerItem] {
        var items: [PickerItem] = []
        for code in availableLanguages {
            guard let info = SubtitleLanguages.info(for: code) else { continue }
            switch code {
            case "he":
                for mode in SubtitleHebrewMode.allCases {
                    guard mode == .standard || isAdmin || hebrewModeAvailable(mode) else { continue }
                    items.append(PickerItem(
                        languageInfo: info,
                        hebrewMode: mode,
                        englishMode: nil
                    ))
                }
            case "en":
                for mode in SubtitleEnglishMode.allCases {
                    guard mode == .standard || isAdmin || englishModeAvailable(mode) else { continue }
                    items.append(PickerItem(
                        languageInfo: info,
                        hebrewMode: nil,
                        englishMode: mode
                    ))
                }
            default:
                items.append(PickerItem(
                    languageInfo: info,
                    hebrewMode: nil,
                    englishMode: nil
                ))
            }
        }
        return items
    }

    func isItemSelected(_ item: PickerItem) -> Bool {
        guard selectedLanguage == item.languageInfo.code else { return false }
        if let hm = item.hebrewMode { return currentHebrewMode == hm }
        if let em = item.englishMode { return currentEnglishMode == em }
        return true
    }

    func isItemAvailable(_ item: PickerItem) -> Bool {
        if isAdmin { return true }
        if let hm = item.hebrewMode {
            return hebrewModeAvailable(hm)
        }
        if let em = item.englishMode {
            return englishModeAvailable(em)
        }
        return true
    }

    func hebrewModeAvailable(_ mode: SubtitleHebrewMode) -> Bool {
        switch mode {
        case .standard: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .heblish: return hasHeblish
        }
    }

    func englishModeAvailable(_ mode: SubtitleEnglishMode) -> Bool {
        switch mode {
        case .standard: return true
        case .engrew: return hasEngrew
        case .grammarFlip: return hasGrammarFlip
        case .slangSynthesis: return hasSlangSynthesis
        }
    }

    func dismissPicker() {
        if let onDismiss {
            onDismiss()
        } else {
            dismiss()
        }
    }

    func rowBackground(isSelected: Bool) -> some View {
        ZStack {
            if isSelected {
                DesignTokens.Primary.p900.opacity(0.3)
            } else {
                DesignTokens.Glass.bg
            }
            VisualEffectBlur(style: .systemUltraThinMaterialDark)
        }
    }
}

/// Represents a mode selection for AI subtitle generation modal
struct ModeSelectionItem: Identifiable {
    let id = UUID()
    let language: String
    let mode: Any // SubtitleHebrewMode or SubtitleEnglishMode
}
