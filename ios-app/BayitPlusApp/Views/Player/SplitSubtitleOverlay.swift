import BayitDesignSystem
import SwiftUI

/// Bilingual split subtitle overlay showing original and translated text
/// side by side with independent styling.
struct SplitSubtitleOverlay: View {
    let originalText: String
    let translatedText: String
    let originalLanguage: String
    let translatedLanguage: String
    let isVisible: Bool
    var bottomInset: CGFloat = DesignTokens.Spacing.xxxl

    var body: some View {
        VStack {
            Spacer()

            if isVisible, !translatedText.isEmpty {
                GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
                    HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                        if !originalText.isEmpty {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                                Text(originalLanguage.uppercased())
                                    .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                    .foregroundStyle(DesignTokens.Text.muted)

                                Text(originalText)
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .lineLimit(4)
                                    .multilineTextAlignment(
                                        originalLanguage == "he" || originalLanguage == "ar"
                                            ? .trailing : .leading
                                    )
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityLabel("Original: \(originalText)")

                            Divider()
                                .frame(width: 1)
                                .background(DesignTokens.Glass.border)
                        }

                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                            Text(translatedLanguage.uppercased())
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                .foregroundStyle(DesignTokens.Primary.p400)

                            Text(translatedText)
                                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(4)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityLabel("Translation: \(translatedText)")
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, bottomInset)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .accessibilityElement(children: .combine)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: isVisible)
    }
}
