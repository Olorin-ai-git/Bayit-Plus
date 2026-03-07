#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Overlay shown on the player when network connectivity is lost.
    /// Pauses playback automatically and resumes when connection restores.
    extension TVPlayerView {
        @ViewBuilder
        var networkDisconnectedOverlay: some View {
            if !networkMonitor.isConnected {
                ZStack {
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()

                    VStack(spacing: TVDesignTokens.Spacing.md) {
                        Image(systemName: "wifi.slash")
                            .font(.system(size: TVDesignTokens.FontSize.display))
                            .foregroundStyle(DesignTokens.Warning.default)

                        Text(localization.t("errors.player.connectionLost"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.xl,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(TVDesignTokens.Spacing.xxl)
                }
                .allowsHitTesting(false)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(
                    localization.t("errors.player.connectionLost")
                )
            }
        }
    }
#endif
