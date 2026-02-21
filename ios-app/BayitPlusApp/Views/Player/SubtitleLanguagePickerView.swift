import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view listing available subtitle languages where each AI-generated
/// variation (Heblish, Engrew, etc.) is an independent selectable row.
struct SubtitleLanguagePickerView: View {
    let availableLanguages: [String]
    let aiLanguages: Set<String>
    let selectedLanguage: String?
    let contentId: String
    let repository: any SubtitleRepository
    let onSelect: (String?) -> Void
    let onRefresh: () -> Void
    var onDismiss: (() -> Void)?
    var onSplitTap: (() -> Void)?
    var isSplitEnabled: Bool = false

    // Mode selection parameters
    var currentHebrewMode: SubtitleHebrewMode = .standard
    var currentEnglishMode: SubtitleEnglishMode = .standard
    var hasNikud: Bool = false
    var hasShoresh: Bool = false
    var hasHeblish: Bool = false
    var hasEngrew: Bool = false
    var isAdmin: Bool = false
    var onHebrewModeSelect: ((SubtitleHebrewMode) -> Void)?
    var onEnglishModeSelect: ((SubtitleEnglishMode) -> Void)?

    @State var selectedModeForGeneration: ModeSelectionItem?

    @Environment(\.dismiss) var dismiss
    @Environment(LocalizationManager.self) var localization

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    offRow

                    ForEach(pickerItems) { item in
                        languageRow(item)
                    }

                    if let onSplitTap, availableLanguages.count >= 2 {
                        splitRow(onSplitTap: onSplitTap)
                    }

                    Divider()
                        .background(DesignTokens.Text.muted.opacity(0.3))
                        .padding(.vertical, DesignTokens.Spacing.md)

                    OpenSubtitlesDownloadView(
                        contentId: contentId,
                        repository: repository,
                        onSuccess: { onRefresh() }
                    )
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("player.subtitles"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismissPicker()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(localization.t("player.subtitles"))
                }
            }
        }
        .environment(\.layoutDirection, localization.layoutDirection)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .sheet(item: $selectedModeForGeneration) { selection in
            if selection.language == "he",
               let mode = selection.mode as? SubtitleHebrewMode
            {
                AISubtitlesPickerView(
                    contentId: contentId,
                    currentMode: mode,
                    hasHebrew: true,
                    hasNikud: hasNikud,
                    hasShoresh: hasShoresh,
                    hasHeblish: hasHeblish,
                    isAdmin: isAdmin,
                    repository: repository,
                    onModeSelect: { selectedMode in
                        onHebrewModeSelect?(selectedMode)
                        selectedModeForGeneration = nil
                        dismiss()
                    },
                    onGenerationComplete: {
                        onRefresh()
                        selectedModeForGeneration = nil
                    }
                )
            }
        }
    }
}
