import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing sheet and alert modifiers
/// extracted from the body to keep the coordinator lean.
extension PlayerView {
    // MARK: - Sheet Content Views

    var splitLanguagePickerSheet: some View {
        SplitSubtitleLanguagePickerView(
            availableLanguages: availableSubtitleLanguages,
            sourceLanguage: "he",
            selectedLanguages: $splitLanguages,
            splitModeEnabled: $splitModeEnabled,
            layout: $splitLayout,
            onConfirm: { languages in
                splitLanguages = languages
                splitModeEnabled = true
                Task {
                    await loadSplitSubtitleCues()
                }
            }
        )
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder
    var characterSelectionSheet: some View {
        if let vm = dialogueVM {
            CharacterSelectionSheet(
                characters: vm.availableCharacters,
                onSelect: { character in
                    showCharacterSheet = false
                    Task { await startDialogue(with: character) }
                },
                onDismiss: { showCharacterSheet = false }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    var dubbingControlsSheet: some View {
        if let vm = liveDubbingVM {
            LiveDubbingControlsView(viewModel: vm, channelId: contentId)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        } else {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("dubbing.title"))
                    .font(.headline)
                Text(localization.t("dubbing.liveOnly"))
                    .foregroundStyle(.secondary)
                GlassButton(localization.t("common.ok"), variant: .primary) {
                    showDubbingControls = false
                }
            }
            .padding(DesignTokens.Spacing.xl)
        }
    }

    var aiLanguagePickerSheet: some View {
        GlassAILanguagePickerView(
            selectedLanguage: selectedAILanguage,
            secondaryLanguage: selectedSecondaryLanguage,
            onSelectLanguage: { handleAILanguageChange($0) },
            onSelectSecondaryLanguage: { lang in
                selectedSecondaryLanguage = lang
                if splitModeEnabled {
                    splitLanguages = [selectedAILanguage, lang]
                    Task { await loadSplitSubtitleCues() }
                }
            }
        )
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    var qualitySelectorSheet: some View {
        QualitySelectorView(
            currentQuality: StreamQuality(rawValue: viewModel.currentQuality ?? "auto") ?? .auto,
            onSelect: { quality in
                Task { await viewModel.switchQuality(quality.rawValue) }
            },
            onDismiss: { showQualitySelector = false }
        )
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Playback Rate Dialog Buttons

    var playbackRateButtons: [Double] {
        [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    }
}
