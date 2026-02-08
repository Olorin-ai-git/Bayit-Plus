import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view listing available subtitle languages for the player.
/// Shows language badge + native name for each language, a highlight on the selected language,
/// and an "Off" option to disable subtitles.
struct SubtitleLanguagePickerView: View {
    let availableLanguages: [String]
    let selectedLanguage: String?
    let onSelect: (String?) -> Void

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
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("player.subtitles"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(localization.t("player.subtitles"))
                }
            }
        }
        .environment(\.layoutDirection, localization.layoutDirection)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Off Row

    private var offRow: some View {
        Button {
            onSelect(nil)
            dismiss()
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
        return Button {
            onSelect(info.code)
            dismiss()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(info.badge)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 24)
                    .background(DesignTokens.Primary.p700)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                VStack(alignment: .leading, spacing: 2) {
                    Text(info.nativeName)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

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
        .accessibilityLabel("\(info.name) subtitles")
        .accessibilityValue(isSelected ? "Selected" : "")
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
