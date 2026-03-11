#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Full-screen Plus intro overlay shown once after first authentication on tvOS.
    /// Focus-navigable for the 10-foot UI. Subscription purchase redirects to mobile/web.
    struct TVPlusIntroOverlayView: View {
        let onSeePlans: () -> Void
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization

        private let features: [(icon: String, key: String)] = [
            ("mic.fill", "bullet1"),
            ("captions.bubble.fill", "bullet2"),
            ("magnifyingglass", "bullet3"),
            ("bitcoinsign.circle.fill", "bullet4"),
        ]

        var body: some View {
            ZStack {
                Color.black.opacity(0.85).ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 64))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("plus.intro.title"))
                        .font(.system(size: 42, weight: .heavy))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)

                    Text(localization.t("plus.intro.subtitle"))
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .multilineTextAlignment(.center)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                        ForEach(features, id: \.key) { feature in
                            HStack(spacing: TVDesignTokens.Spacing.md) {
                                Image(systemName: feature.icon)
                                    .font(.system(size: 28))
                                    .foregroundStyle(DesignTokens.Primary.p400)
                                    .frame(width: 36)
                                Text(localization.t("plus.intro.\(feature.key)"))
                                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                                    .foregroundStyle(DesignTokens.Text.primary)
                            }
                        }
                    }
                    .padding(.vertical, TVDesignTokens.Spacing.lg)

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        GlassButton(
                            localization.t("plus.intro.seePlans"),
                            variant: .primary,
                            size: .large
                        ) {
                            TVPlusIntroOverlayView.markAsSeen()
                            onSeePlans()
                        }
                        .buttonStyle(.card)

                        Button {
                            TVPlusIntroOverlayView.markAsSeen()
                            onDismiss()
                        } label: {
                            Text(localization.t("plus.intro.maybeLater"))
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                                .padding(.vertical, TVDesignTokens.Spacing.md)
                        }
                        .buttonStyle(.card)
                    }
                }
                .padding(TVDesignTokens.Spacing.xxl)
                .frame(maxWidth: 900)
            }
        }

        // MARK: - Persistence

        private static let seenKey = "bayit_plus_intro_seen"

        static var hasBeenSeen: Bool {
            UserDefaults.standard.bool(forKey: seenKey)
        }

        static func markAsSeen() {
            UserDefaults.standard.set(true, forKey: seenKey)
        }
    }
#endif
