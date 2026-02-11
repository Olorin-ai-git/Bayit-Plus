import BayitDesignSystem
import SwiftUI

/// tvOS AI language picker for selecting the target language for live features.
/// Uses focusable card buttons for Siri Remote navigation.
struct TVAILanguagePickerView: View {
    let selectedLanguage: String
    let onSelect: (String) -> Void
    let onDismiss: () -> Void

    private let languages: [(code: String, name: String, flag: String)] = [
        ("en", "English", "EN"),
        ("he", "Hebrew", "HE"),
        ("es", "Spanish", "ES"),
        ("fr", "French", "FR"),
        ("de", "German", "DE"),
        ("ru", "Russian", "RU"),
        ("ar", "Arabic", "AR"),
        ("zh", "Chinese", "ZH"),
        ("ja", "Japanese", "JA"),
        ("hi", "Hindi", "HI"),
    ]

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("AI Language")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text("Select target language for live translation, dubbing, and trivia")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(languages, id: \.code) { lang in
                    Button {
                        onSelect(lang.code)
                        onDismiss()
                    } label: {
                        VStack(spacing: TVDesignTokens.Spacing.sm) {
                            Text(lang.flag)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.lg,
                                    weight: .bold
                                ))
                                .foregroundStyle(
                                    selectedLanguage == lang.code
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Text.primary
                                )

                            Text(lang.name)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        .frame(
                            minWidth: TVDesignTokens.MinSize.focusableWidth,
                            minHeight: TVDesignTokens.MinSize.focusableHeight
                        )
                        .overlay(alignment: .topTrailing) {
                            if selectedLanguage == lang.code {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 18))
                                    .foregroundStyle(DesignTokens.Primary.p400)
                                    .padding(TVDesignTokens.Spacing.xs)
                            }
                        }
                    }
                    .buttonStyle(.card)
                }
            }

            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.top, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
    }
}
