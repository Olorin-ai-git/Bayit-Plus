import BayitDesignSystem
import SwiftUI

/// Overlay displaying original and translated subtitle text during live translation,
/// positioned at the bottom of the player with a 5-second auto-fade.
struct LiveSubtitleOverlayView: View {
    let translatedText: String
    let originalText: String?
    let isVisible: Bool
    /// Distance from the bottom edge to clear player controls and AI panel.
    var bottomInset: CGFloat = DesignTokens.Spacing.xxxl

    var body: some View {
        VStack {
            Spacer()

            if isVisible, !translatedText.isEmpty {
                GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        if let original = originalText, !original.isEmpty {
                            Text(original)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .lineLimit(2)
                                .accessibilityLabel("Original: \(original)")
                        }

                        Text(translatedText)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(3)
                            .accessibilityLabel("Subtitle: \(translatedText)")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, bottomInset)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .accessibilityElement(children: .combine)
                .accessibilityLabel(accessibilityDescription)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: isVisible)
    }

    private var accessibilityDescription: String {
        var parts: [String] = []
        if let original = originalText, !original.isEmpty {
            parts.append("Original: \(original)")
        }
        if !translatedText.isEmpty {
            parts.append("Subtitle: \(translatedText)")
        }
        return parts.joined(separator: ". ")
    }
}
