import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view listing available subtitle languages with emoji flags, AI indicators, and mode selection.
/// Enhanced with OpenSubtitles download integration.
struct SubtitleLanguagePickerView: View {
    let availableLanguages: [String]
    let aiLanguages: Set<String>
    let selectedLanguage: String?
    let contentId: String
    let repository: any SubtitleRepository
    let onSelect: (String?) -> Void
    let onRefresh: () -> Void
    var onDismiss: (() -> Void)?

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

    @State private var showModePickerForLanguage: String?
    @State private var selectedModeForGeneration: ModeSelectionItem?

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    offRow

                    ForEach(languageRows, id: \.code) { info in
                        languageRow(info)
                    }

                    Divider()
                        .background(DesignTokens.Text.muted.opacity(0.3))
                        .padding(.vertical, DesignTokens.Spacing.md)

                    OpenSubtitlesDownloadView(
                        contentId: contentId,
                        repository: repository,
                        onSuccess: {
                            onRefresh()
                        }
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
                        if let onDismiss {
                            onDismiss()
                        } else {
                            dismiss()
                        }
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
    }

    // MARK: - Off Row

    private var offRow: some View {
        Button {
            onSelect(nil)
            if let onDismiss {
                onDismiss()
            } else {
                dismiss()
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "slash.circle")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("player.subtitlesOff"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if selectedLanguage == nil {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(rowBackground(isSelected: selectedLanguage == nil))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("player.subtitlesOff"))
        .accessibilityValue(selectedLanguage == nil ? "Selected" : "")
    }

    // MARK: - Language Row

    private func languageRow(_ info: SubtitleLanguageInfo) -> some View {
        let isSelected = selectedLanguage == info.code
        let hasAI = aiLanguages.contains(info.code)
        let hasModePicker = info.code == "he" || info.code == "en"

        return VStack(spacing: 0) {
            Button {
                onSelect(info.code)
                // For Hebrew/English, stay open so user can interact with mode chips
                // Only dismiss for other languages or if language was already selected
                if !hasModePicker || isSelected {
                    if let onDismiss {
                        onDismiss()
                    } else {
                        dismiss()
                    }
                }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    // Emoji flag
                    Text(info.emojiFlag)
                        .font(.system(size: 24))

                    // Badge
                    Text(info.badge)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 24)
                        .background(DesignTokens.Primary.p700)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Text(info.nativeName)
                                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)

                            if hasAI {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 12))
                                    .foregroundStyle(DesignTokens.Primary.p400)
                            }
                        }

                        Text(info.name)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .padding(DesignTokens.Spacing.md)
                .background(rowBackground(isSelected: isSelected))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
            .buttonStyle(.plain)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(info.name) subtitles\(hasAI ? " with AI modes" : "")")
            .accessibilityValue(isSelected ? "Selected" : "")

            // Mode chips for selected language
            if isSelected && (info.code == "he" || info.code == "en") {
                modeChips(for: info.code)
                    .padding(.top, DesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Mode Chips

    private func modeChips(for language: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("AI Modes:")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p400)
                .padding(.leading, DesignTokens.Spacing.xs)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    if language == "he" {
                        ForEach(SubtitleHebrewMode.allCases, id: \.self) { mode in
                            hebrewModeChip(mode: mode)
                        }
                    } else if language == "en" {
                        ForEach(SubtitleEnglishMode.allCases, id: \.self) { mode in
                            englishModeChip(mode: mode)
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.xs)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .sheet(item: $selectedModeForGeneration) { selection in
            if selection.language == "he", let mode = selection.mode as? SubtitleHebrewMode {
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

    private func hebrewModeChip(mode: SubtitleHebrewMode) -> some View {
        let isSelected = mode == currentHebrewMode
        let isAvailable = isModeAvailable(mode, language: "he")
        let isAI = mode != .standard

        return Button {
            if isAvailable {
                // Mode is available - select it directly
                onHebrewModeSelect?(mode)
                dismiss()
            } else {
                // Mode not available - show generation modal
                selectedModeForGeneration = ModeSelectionItem(language: "he", mode: mode)
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                if isAI {
                    Image(systemName: isAvailable ? "sparkles" : "lock.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(isSelected ? .white : DesignTokens.Primary.p400)
                }
                Text(mode.displayName)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(isSelected ? .white : (isAvailable ? .white : .gray))
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(isSelected ? DesignTokens.Primary.p500 : (isAI ? Color.purple.opacity(0.25) : Color.white.opacity(0.1)))
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.p400 : (isAI ? Color.purple.opacity(0.5) : Color.white.opacity(0.2)),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable && !isAI) // Only allow interaction with standard and AI modes
    }

    private func englishModeChip(mode: SubtitleEnglishMode) -> some View {
        let isSelected = mode == currentEnglishMode
        let isAvailable = isModeAvailable(mode, language: "en")
        let isAI = mode != .standard

        return Button {
            if isAvailable {
                // Mode is available - select it directly
                onEnglishModeSelect?(mode)
                dismiss()
            } else {
                // Mode not available - would show generation modal (when implemented)
                // For now, just select standard
                onEnglishModeSelect?(.standard)
                dismiss()
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                if isAI {
                    Image(systemName: isAvailable ? "sparkles" : "lock.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(isSelected ? .white : DesignTokens.Primary.p400)
                }
                Text(mode.displayName)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(isSelected ? .white : (isAvailable ? .white : .gray))
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(isSelected ? DesignTokens.Primary.p500 : (isAI ? Color.purple.opacity(0.25) : Color.white.opacity(0.1)))
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.p400 : (isAI ? Color.purple.opacity(0.5) : Color.white.opacity(0.2)),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func isModeAvailable(_ mode: SubtitleHebrewMode, language: String) -> Bool {
        switch mode {
        case .standard: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .heblish: return hasHeblish
        }
    }

    private func isModeAvailable(_ mode: SubtitleEnglishMode, language: String) -> Bool {
        switch mode {
        case .standard: return true
        case .engrew: return hasEngrew
        }
    }

    // MARK: - Helpers

    private var languageRows: [SubtitleLanguageInfo] {
        availableLanguages.compactMap { SubtitleLanguages.info(for: $0) }
    }

    private func rowBackground(isSelected: Bool) -> some View {
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

// MARK: - Supporting Types

/// Represents a mode selection for AI subtitle generation modal
struct ModeSelectionItem: Identifiable {
    let id = UUID()
    let language: String
    let mode: Any  // SubtitleHebrewMode or SubtitleEnglishMode
}
