import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subtitle language picker where each AI-generated variation
/// (Heblish, Engrew, etc.) is an independent selectable row.
struct TVSubtitleLanguagePickerView: View {
    @Environment(LocalizationManager.self) private var localization
    let availableLanguages: [String]
    let selectedLanguage: String?
    let isSplitEnabled: Bool
    let onSelect: (String?) -> Void
    let onSplitTap: () -> Void
    let onDismiss: () -> Void

    // AI mode support
    var contentId: String = ""
    var repository: (any SubtitleRepository)?
    var currentHebrewMode: SubtitleHebrewMode = .standard
    var currentEnglishMode: SubtitleEnglishMode = .standard
    var hasNikud: Bool = false
    var hasShoresh: Bool = false
    var hasHeblish: Bool = false
    var hasEngrew: Bool = false
    var isAdmin: Bool = false
    var onHebrewModeSelect: ((SubtitleHebrewMode) -> Void)?
    var onEnglishModeSelect: ((SubtitleEnglishMode) -> Void)?
    var onSubtitlesRefresh: (() -> Void)?

    @State private var generatingMode: String?
    @State private var jobProgress: Int = 0
    @State private var currentJobId: String?
    @State private var generationError: String?
    @State private var pollingTask: Task<Void, Never>?
    @State private var isCancelling = false

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("subtitles.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    TVSubtitleOffButton(
                        selectedLanguage: selectedLanguage,
                        onSelect: onSelect,
                        onDismiss: onDismiss
                    )

                    ForEach(pickerItems) { item in
                        TVSubtitleLanguageButton(
                            item: item,
                            isSelected: isItemSelected(item),
                            isAvailable: isItemAvailable(item),
                            isGenerating: isItemGenerating(item),
                            jobProgress: jobProgress,
                            onTap: {
                                handleItemTap(
                                    item,
                                    isAvailable: isItemAvailable(item),
                                    isGenerating: isItemGenerating(item)
                                )
                            }
                        )
                    }

                    generationErrorView

                    if availableLanguages.count >= 2 {
                        TVSubtitleSplitButton(
                            isSplitEnabled: isSplitEnabled,
                            onSplitTap: onSplitTap
                        )
                    }

                    if let repo = repository, !contentId.isEmpty {
                        Divider()
                            .background(DesignTokens.Text.muted.opacity(0.3))
                            .padding(.vertical, TVDesignTokens.Spacing.sm)

                        TVOpenSubtitlesDownloadView(
                            contentId: contentId,
                            repository: repo,
                            onSuccess: { onSubtitlesRefresh?() }
                        )
                    }
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.top, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onAppear { checkActiveJobs() }
        .onDisappear { pollingTask?.cancel() }
    }

    // MARK: - Error View

    @ViewBuilder
    private var generationErrorView: some View {
        if let error = generationError {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 14))
                    .foregroundStyle(.red)

                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(.red.opacity(0.9))
            }
            .padding(.leading, TVDesignTokens.Spacing.lg)
        }
    }

    // MARK: - Helpers

    var pickerItems: [SubtitlePickerItem] {
        var items: [SubtitlePickerItem] = []
        for code in availableLanguages {
            guard let info = SubtitleLanguages.info(for: code) else { continue }
            switch code {
            case "he":
                for mode in SubtitleHebrewMode.allCases {
                    items.append(SubtitlePickerItem(
                        languageInfo: info, hebrewMode: mode, englishMode: nil
                    ))
                }
            case "en":
                for mode in SubtitleEnglishMode.allCases {
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

    private func hebrewModeAvailable(_ mode: SubtitleHebrewMode) -> Bool {
        switch mode {
        case .standard: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .heblish: return hasHeblish
        }
    }

    private func englishModeAvailable(_ mode: SubtitleEnglishMode) -> Bool {
        switch mode {
        case .standard: return true
        case .engrew: return hasEngrew
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
            if let hm = item.hebrewMode, hm != .standard {
                Task { await triggerHebrewGeneration(mode: hm) }
            } else if item.englishMode == .engrew {
                Task { await triggerEngrewGeneration() }
            }
            return
        }

        onSelect(item.languageInfo.code)
        if let hm = item.hebrewMode { onHebrewModeSelect?(hm) }
        if let em = item.englishMode { onEnglishModeSelect?(em) }
        onDismiss()
    }
}

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
