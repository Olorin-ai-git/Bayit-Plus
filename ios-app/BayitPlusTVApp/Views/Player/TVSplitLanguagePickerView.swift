import BayitDesignSystem
import SwiftUI

/// tvOS split subtitle language picker for selecting two languages for side-by-side display.
struct TVSplitLanguagePickerView: View {
    let availableLanguages: [String]
    @Binding var selectedLanguages: [String]
    let onConfirm: ([String]) -> Void
    let onDismiss: () -> Void

    @State private var primary: String = "he"
    @State private var secondary: String = "en"

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text("Split Subtitles")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Select two languages to display simultaneously")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)

            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                languageColumn(title: "Primary", selection: $primary)
                languageColumn(title: "Secondary", selection: $secondary)
            }
            .padding(.vertical, TVDesignTokens.Spacing.xl)

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Button("Cancel") { onDismiss() }
                    .buttonStyle(.card)

                Button("Confirm") {
                    onConfirm([primary, secondary])
                }
                .buttonStyle(.card)
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .background(DesignTokens.Background.primary)
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

    private func languageColumn(title: String, selection: Binding<String>) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(availableLanguages, id: \.self) { lang in
                let info = SubtitleLanguages.info(for: lang)
                let isSelected = selection.wrappedValue == lang

                Button {
                    selection.wrappedValue = lang
                } label: {
                    HStack {
                        Text(info?.emojiFlag ?? "")
                            .font(.system(size: 28))
                        Text(info?.nativeName ?? lang)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                }
                .buttonStyle(.card)
            }
        }
    }
}
