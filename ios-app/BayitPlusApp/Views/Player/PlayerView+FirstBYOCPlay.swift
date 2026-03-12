#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// First BYOC playback "aha moment": auto-enable subtitles, one-time overlay hint,
    /// and AI panel pulse on the first YouTube content play.
    extension PlayerView {
        func handleFirstBYOCPlayIfNeeded() {
            guard mediaContentType.isYouTubeSource else { return }
            let state = AIGatewayState()
            guard !state.firstBYOCPlayCompleted else { return }

            state.markFirstBYOCPlay()

            // Auto-enable subtitles so the user sees AI in action immediately
            if selectedSubtitleLanguage == nil {
                handleSubtitleSelection(selectedAILanguage)
            }

            // Pulse the AI panel open after a short delay
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(1.5))
                withAnimation(.spring(duration: 0.4)) {
                    showAIPanel = true
                }
                showFirstBYOCOverlay = true

                // Auto-collapse panel after 4 seconds
                try? await Task.sleep(for: .seconds(4))
                withAnimation(.spring(duration: 0.3)) {
                    showAIPanel = false
                }

                // Dismiss overlay after 6 seconds total
                try? await Task.sleep(for: .seconds(2))
                withAnimation(.easeOut(duration: 0.3)) {
                    showFirstBYOCOverlay = false
                }
            }
        }

        var firstBYOCPlayOverlay: some View {
            VStack {
                Spacer()
                if showFirstBYOCOverlay {
                    Text(localization.t("ai.gateway.firstPlay.hint"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)
                        .padding(DesignTokens.Spacing.md)
                        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
                        .padding(.horizontal, DesignTokens.Spacing.xl)
                        .padding(.bottom, DesignTokens.Spacing.xxl)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .onTapGesture {
                            withAnimation(.easeOut(duration: 0.3)) {
                                showFirstBYOCOverlay = false
                            }
                        }
                }
            }
        }
    }
#endif
