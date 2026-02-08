import BayitDesignSystem
import SwiftUI

/// Overlay displaying original and translated text during live dubbing,
/// positioned at the bottom of the player with a 4-second auto-fade.
struct LiveDubbingOverlayView: View {
    let originalText: String?
    let translatedText: String?
    let isVisible: Bool

    var body: some View {
        VStack {
            Spacer()

            if isVisible, hasContent {
                GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        if let original = originalText, !original.isEmpty {
                            Text(original)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .lineLimit(2)
                                .accessibilityLabel("Original: \(original)")
                        }

                        if let translated = translatedText, !translated.isEmpty {
                            Text(translated)
                                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(3)
                                .accessibilityLabel("Translation: \(translated)")
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.xxxl)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .accessibilityElement(children: .combine)
                .accessibilityLabel(accessibilityDescription)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: isVisible)
    }

    private var hasContent: Bool {
        let hasOriginal = originalText != nil && !(originalText?.isEmpty ?? true)
        let hasTranslated = translatedText != nil && !(translatedText?.isEmpty ?? true)
        return hasOriginal || hasTranslated
    }

    private var accessibilityDescription: String {
        var parts: [String] = []
        if let original = originalText, !original.isEmpty {
            parts.append("Original: \(original)")
        }
        if let translated = translatedText, !translated.isEmpty {
            parts.append("Translation: \(translated)")
        }
        return parts.joined(separator: ". ")
    }
}
