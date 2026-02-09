#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Live split-screen subtitle overlay that shows original and translated text side-by-side.
///
/// Mirrors the VOD `SplitSubtitleOverlayView` layout (two panes with a divider)
/// but is driven by real-time WebSocket cue strings instead of pre-loaded cue arrays.
struct LiveSplitSubtitleOverlayView: View {
    let originalText: String?
    let translatedText: String
    let originalLanguage: String
    let translatedLanguage: String
    let isVisible: Bool
    var bottomInset: CGFloat = DesignTokens.Spacing.xxxl

    private let fontSize: CGFloat = SubtitleFontSize.medium.value

    var body: some View {
        VStack {
            Spacer()

            if isVisible, !translatedText.isEmpty {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    // Left pane: original (source) language
                    livePaneView(
                        text: originalText,
                        language: originalLanguage,
                        position: .left
                    )
                    .frame(maxWidth: .infinity)

                    // Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.25))
                        .frame(width: 2, height: 60)
                        .cornerRadius(1)

                    // Right pane: translated (target) language
                    livePaneView(
                        text: translatedText,
                        language: translatedLanguage,
                        position: .right
                    )
                    .frame(maxWidth: .infinity)
                }
                .frame(height: 80)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, bottomInset)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .frame(maxHeight: .infinity, alignment: .bottom)
        .animation(.easeInOut(duration: 0.3), value: isVisible)
        .allowsHitTesting(false)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
    }

    // MARK: - Pane View

    @ViewBuilder
    private func livePaneView(
        text: String?,
        language: String,
        position: SubtitlePaneView.SubtitlePanePosition
    ) -> some View {
        let info = SubtitleLanguages.info(for: language)
        let isRTL = info?.isRTL ?? false

        VStack(alignment: position.alignment, spacing: DesignTokens.Spacing.xs) {
            if let text, !text.isEmpty {
                Text(text)
                    .font(.system(size: fontSize, weight: .semibold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(isRTL ? .trailing : .leading)
                    .environment(\.layoutDirection, isRTL ? .rightToLeft : .leftToRight)
                    .lineLimit(nil)
                    .padding(.vertical, 4)
                    .padding(.horizontal, 12)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                            .fill(Color.black.opacity(0.6))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                            .stroke(position.borderColor, lineWidth: 3)
                    )
                    .shadow(color: .black.opacity(0.8), radius: 4, x: 0, y: 0)
                    .padding(.vertical, 2)
            } else {
                Rectangle()
                    .fill(Color.clear)
                    .frame(height: 28)
            }

            // Language indicator
            HStack(spacing: 4) {
                Text(info?.emojiFlag ?? "")
                    .font(.system(size: 12))
                Text(info?.nativeName ?? language.uppercased())
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 2)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(Color.white.opacity(0.1))
            )
        }
        .frame(maxWidth: .infinity)
    }

    private var accessibilityDescription: String {
        var parts: [String] = []
        if let original = originalText, !original.isEmpty {
            parts.append("Original: \(original)")
        }
        if !translatedText.isEmpty {
            parts.append("Translated: \(translatedText)")
        }
        return parts.joined(separator: ". ")
    }
}
#endif
