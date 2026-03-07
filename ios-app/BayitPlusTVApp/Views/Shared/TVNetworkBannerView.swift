#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Non-intrusive overlay banner displayed at the top of the screen when
    /// the Apple TV loses network connectivity. Slides in/out with animation
    /// and auto-dismisses when the connection is restored.
    struct TVNetworkBannerView: View {
        @Environment(LocalizationManager.self) var localization
        let isConnected: Bool

        @State private var isVisible = false

        var body: some View {
            VStack {
                if isVisible {
                    bannerContent
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                Spacer()
            }
            .onChange(of: isConnected) { _, connected in
                withAnimation(.easeInOut(duration: 0.4)) {
                    isVisible = !connected
                }
            }
            .onAppear {
                isVisible = !isConnected
            }
        }

        // MARK: - Banner Content

        private var bannerContent: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(.white)

                Text(localization.t("errors.offline.title"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .frame(maxWidth: .infinity)
            .background(
                DesignTokens.Warning.default.opacity(0.92)
            )
            .allowsHitTesting(false)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(localization.t("errors.offline.title"))
        }
    }
#endif
