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
    var hasGrammarFlip: Bool = false
    var hasSlangSynthesis: Bool = false
    var isAdmin: Bool = false
    var onHebrewModeSelect: ((SubtitleHebrewMode) -> Void)?
    var onEnglishModeSelect: ((SubtitleEnglishMode) -> Void)?
    var onSubtitlesRefresh: (() -> Void)?

    @State var generatingMode: String?
    @State var jobProgress: Int = 0
    @State var currentJobId: String?
    @State var generationError: String?
    @State var pollingTask: Task<Void, Never>?
    @State var isCancelling = false
    @State var pendingGenerationItem: SubtitlePickerItem?

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
        .overlay {
            if let item = pendingGenerationItem {
                TVAIGenerationConfirmDialog(
                    modeName: item.displayLabel,
                    modeDescription: aiModeDescription(for: item),
                    onConfirm: {
                        let captured = item
                        pendingGenerationItem = nil
                        confirmAndGenerate(captured)
                    },
                    onDismiss: { pendingGenerationItem = nil }
                )
            }
        }
    }

    private func aiModeDescription(for item: SubtitlePickerItem) -> String {
        if let hm = item.hebrewMode { return hm.description }
        if let em = item.englishMode { return em.description }
        return ""
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
}
