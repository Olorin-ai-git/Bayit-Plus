import BayitDesignSystem
import SwiftUI

/// tvOS-optimized bilingual split subtitle overlay with larger fonts for 10-foot UI.
struct TVSplitSubtitleOverlay: View {
    let originalText: String
    let translatedText: String
    let originalLanguage: String
    let translatedLanguage: String
    let isVisible: Bool

    var body: some View {
        VStack {
            Spacer()

            if isVisible, !translatedText.isEmpty {
                GlassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.lg) {
                    HStack(alignment: .top, spacing: DesignTokens.Spacing.xl) {
                        if !originalText.isEmpty {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                                Text(originalLanguage.uppercased())
                                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                                    .foregroundStyle(DesignTokens.Text.muted)

                                Text(originalText)
                                    .font(.system(size: TVDesignTokens.FontSize.base))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .lineLimit(3)
                                    .multilineTextAlignment(
                                        originalLanguage == "he" || originalLanguage == "ar"
                                            ? .trailing : .leading
                                    )
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)

                            Divider()
                                .frame(width: 2)
                                .background(DesignTokens.Glass.border)
                        }

                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text(translatedLanguage.uppercased())
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                                .foregroundStyle(DesignTokens.Colors.Primary.light)

                            Text(translatedText)
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(3)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.bottom, TVDesignTokens.Spacing.xxxl)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: isVisible)
    }
}
