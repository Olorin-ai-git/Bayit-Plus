import BayitDesignSystem
import SwiftUI

/// Sheet view listing available subtitle languages for the player.
/// Shows flag + native name for each language, a highlight on the selected language,
/// and an "Off" option to disable subtitles.
struct SubtitleLanguagePickerView: View {
    let availableLanguages: [String]
    let selectedLanguage: String?
    let onSelect: (String?) -> Void

    @Environment(\.dismiss) private var dismiss

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
            .navigationTitle("Subtitles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .accessibilityLabel("Close subtitle picker")
                }
            }
        }
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

                Text("Off")
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
    }

    // MARK: - Language Row

    private func languageRow(_ info: SubtitleLanguageInfo) -> some View {
        let isSelected = selectedLanguage == info.code
        return Button {
            onSelect(info.code)
            dismiss()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(info.flag)
                    .font(.system(size: 24))

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
