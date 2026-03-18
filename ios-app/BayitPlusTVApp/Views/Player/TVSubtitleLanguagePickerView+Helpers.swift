import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVSubtitleLanguagePickerView + Picker Logic

extension TVSubtitleLanguagePickerView {
    var pickerItems: [SubtitlePickerItem] {
        var items: [SubtitlePickerItem] = []
        for code in availableLanguages {
            guard let info = SubtitleLanguages.info(for: code) else { continue }
            switch code {
            case "he":
                for mode in SubtitleHebrewMode.allCases {
                    guard mode == .standard || isAdmin || hebrewModeAvailable(mode) else { continue }
                    items.append(SubtitlePickerItem(
                        languageInfo: info, hebrewMode: mode, englishMode: nil
                    ))
                }
            case "en":
                for mode in SubtitleEnglishMode.allCases {
                    guard mode == .standard || isAdmin || englishModeAvailable(mode) else { continue }
                    items.append(SubtitlePickerItem(
                        languageInfo: info, hebrewMode: nil, englishMode: mode
                    ))
                }
            default:
                items.append(SubtitlePickerItem(
                    languageInfo: info, hebrewMode: nil, englishMode: nil
                ))
            }
        }
        return items
    }

    func isItemSelected(_ item: SubtitlePickerItem) -> Bool {
        guard selectedLanguage == item.languageInfo.code else { return false }
        if let hm = item.hebrewMode { return currentHebrewMode == hm }
        if let em = item.englishMode { return currentEnglishMode == em }
        return true
    }

    func isItemAvailable(_ item: SubtitlePickerItem) -> Bool {
        if isAdmin { return true }
        if let hm = item.hebrewMode { return hebrewModeAvailable(hm) }
        if let em = item.englishMode { return englishModeAvailable(em) }
        return true
    }

    func isItemGenerating(_ item: SubtitlePickerItem) -> Bool {
        if let hm = item.hebrewMode, hm != .standard {
            return generatingMode == hm.rawValue
        }
        if let em = item.englishMode, em != .standard {
            return generatingMode == em.rawValue
        }
        return false
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

    func handleItemTap(
        _ item: SubtitlePickerItem, isAvailable: Bool, isGenerating: Bool
    ) {
        if item.isAI, isGenerating {
            Task { await handleCancelJob() }
            return
        }

        if item.isAI, !isAvailable {
            let isAIMode = (item.hebrewMode != nil && item.hebrewMode != .standard)
                || (item.englishMode != nil && item.englishMode != .standard)
            guard isAIMode else { return }

            if let coordinator = creditCoordinator,
               let balance = creditBalance
            {
                pendingGenerationItem = item
                coordinator.onConfirmed = { _, _ in
                    let captured = item
                    pendingGenerationItem = nil
                    confirmAndGenerate(captured)
                }
                coordinator.onDeclined = {
                    pendingGenerationItem = nil
                }
                coordinator.onUpgradeRequested = {
                    pendingGenerationItem = nil
                }
                coordinator.present(
                    feature: .subtitleGeneration,
                    balance: balance
                )
            } else {
                pendingGenerationItem = item
                confirmAndGenerate(item)
                pendingGenerationItem = nil
            }
            return
        }

        onSelect(item.languageInfo.code)
        if let hm = item.hebrewMode { onHebrewModeSelect?(hm) }
        if let em = item.englishMode { onEnglishModeSelect?(em) }
        onDismiss()
    }

    func confirmAndGenerate(_ item: SubtitlePickerItem) {
        if let hm = item.hebrewMode, hm != .standard {
            Task { await triggerHebrewGeneration(mode: hm) }
        } else if let em = item.englishMode, em != .standard {
            Task { await triggerEnglishGeneration(mode: em) }
        }
    }
}
