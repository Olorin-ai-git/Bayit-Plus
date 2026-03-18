import BayitDesignSystem
import SwiftUI

/// tvOS overlay for live translated subtitles from WebSocket.
/// Supports stacked (translated over original) and side-by-side layouts.
struct TVLiveSubtitleOverlayView: View {
    let translatedText: String
    let originalText: String
    let isVisible: Bool
    var layout: SplitSubtitleLayout = .stacked
    var targetLang: String = "en"
    var sourceLang: String = "he"

    var body: some View {
        if isVisible, !translatedText.isEmpty {
            VStack {
                Spacer()

                Group {
                    if layout == .sideBySide {
                        sideBySideContent
                    } else {
                        stackedContent
                    }
                }
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
            .transition(.opacity)
            .animation(.easeInOut(duration: 0.2), value: translatedText)
        }
    }

    private var stackedContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Text(translatedText)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundColor(.white)
                Text(SubtitleLanguages.emojiFlag(for: targetLang))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
            }
            .multilineTextAlignment(.center)

            if !originalText.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(originalText)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(SubtitleLanguages.emojiFlag(for: sourceLang))
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                }
                .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background(Color.black.opacity(0.7))
        .cornerRadius(TVDesignTokens.Radius.md)
        .frame(maxWidth: 800)
    }

    private var sideBySideContent: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            subtitlePane(
                text: translatedText,
                flag: SubtitleLanguages.emojiFlag(for: targetLang)
            )

            if !originalText.isEmpty {
                subtitlePane(
                    text: originalText,
                    flag: SubtitleLanguages.emojiFlag(for: sourceLang)
                )
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func subtitlePane(text: String, flag: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
            Text(flag)
                .font(.system(size: TVDesignTokens.FontSize.md))
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background(Color.black.opacity(0.7))
        .cornerRadius(TVDesignTokens.Radius.md)
    }
}
