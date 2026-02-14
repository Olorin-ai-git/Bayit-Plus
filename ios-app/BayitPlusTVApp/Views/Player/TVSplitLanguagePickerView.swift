import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS split subtitle language picker for selecting two languages for side-by-side display.
struct TVSplitLanguagePickerView: View {
    @Environment(LocalizationManager.self) private var localization
    let availableLanguages: [String]
    @Binding var selectedLanguages: [String]
    @Binding var layout: SplitSubtitleLayout
    let onConfirm: ([String]) -> Void
    let onDismiss: () -> Void

    @State private var primary: String = "he"
    @State private var secondary: String = "en"

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("subtitles.splitDisplay"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("subtitles.selectTwoLanguages"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)

            // Layout toggle
            layoutToggle

            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxxxl) {
                languageColumn(title: "Primary", selection: $primary)
                languageColumn(title: "Secondary", selection: $secondary)
            }
            .padding(.vertical, TVDesignTokens.Spacing.md)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                Button {
                    onDismiss()
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                        Text(localization.t("common.cancel"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 180)
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                }
                .buttonStyle(.card)

                Button {
                    onConfirm([primary, secondary])
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 18, weight: .medium))
                        Text(localization.t("common.confirm"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 180)
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                    .background(DesignTokens.Primary.p500.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .buttonStyle(.card)
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 1100)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onAppear {
            if selectedLanguages.count >= 2 {
                primary = selectedLanguages[0]
                secondary = selectedLanguages[1]
            } else if availableLanguages.contains("he") {
                primary = "he"
                secondary = availableLanguages.first { $0 != "he" } ?? "en"
            }
        }
    }

    // MARK: - Layout Toggle

    private var layoutToggle: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(SplitSubtitleLayout.allCases, id: \.self) { option in
                GlassChip(
                    title: option.label,
                    isSelected: layout == option
                ) {
                    layout = option
                }
                .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            }
        }
    }

    // MARK: - Language Column

    private func languageColumn(title: String, selection: Binding<String>) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(availableLanguages, id: \.self) { lang in
                        let info = SubtitleLanguages.info(for: lang)
                        let isSelected = selection.wrappedValue == lang

                        Button {
                            selection.wrappedValue = lang
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.md) {
                                Text(info?.emojiFlag ?? "")
                                    .font(.system(size: 28))

                                Text(info?.nativeName ?? lang)
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.primary)
                                    .lineLimit(1)

                                Spacer()

                                if isSelected {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 24))
                                        .foregroundStyle(DesignTokens.Primary.p400)
                                }
                            }
                            .frame(width: 360)
                            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        }
                        .buttonStyle(.card)
                    }
                }
            }
            .frame(maxHeight: 600)
        }
    }
}
