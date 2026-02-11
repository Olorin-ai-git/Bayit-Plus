import BayitDesignSystem
import SwiftUI

/// tvOS overlay for live translated subtitles from WebSocket.
/// Shows the most recent translated text at the bottom of the screen.
struct TVLiveSubtitleOverlayView: View {
    let translatedText: String
    let originalText: String
    let isVisible: Bool

    var body: some View {
        if isVisible, !translatedText.isEmpty {
            VStack {
                Spacer()

                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(translatedText)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)

                    if !originalText.isEmpty {
                        Text(originalText)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(Color.black.opacity(0.7))
                .cornerRadius(TVDesignTokens.Radius.md)
                .frame(maxWidth: 800)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
            .transition(.opacity)
            .animation(.easeInOut(duration: 0.2), value: translatedText)
        }
    }
}
