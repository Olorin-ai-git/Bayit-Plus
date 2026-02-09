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

    @State private var showModePickerForLanguage: String?

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

        return VStack(spacing: 0) {
            Button {
                onSelect(info.code)
                if let onDismiss {
                    onDismiss()
                } else {
                    dismiss()
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
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text("Modes:")
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)

            if language == "he" {
                ForEach(SubtitleHebrewMode.allCases, id: \.self) { mode in
                    GlassChip(
                        title: mode.displayName,
                        isSelected: false
                    ) {
                        showModePickerForLanguage = language
                    }
                }
            } else if language == "en" {
                ForEach(SubtitleEnglishMode.allCases, id: \.self) { mode in
                    GlassChip(
                        title: mode.displayName,
                        isSelected: false
                    ) {
                        showModePickerForLanguage = language
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
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
