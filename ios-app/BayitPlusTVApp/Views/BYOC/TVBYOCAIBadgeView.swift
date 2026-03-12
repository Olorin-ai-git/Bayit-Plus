#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Badge overlay showing available AI features for BYOC content.
    /// Displays on content cards to indicate which AI enhancements work.
    struct TVBYOCAIBadgeView: View {
        @Environment(LocalizationManager.self) private var localization
        let capabilities: BYOCCapabilities

        var body: some View {
            if hasAICapabilities {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: badgeIcon)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                    Text(badgeText)
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xxs)
                .background(badgeColor.opacity(0.9))
                .clipShape(Capsule())
            }
        }

        private var hasAICapabilities: Bool {
            capabilities.dubbing || capabilities.audioOverlayOnly
                || capabilities.interactiveSubtitles || capabilities.liveSubtitles
        }

        private var badgeIcon: String {
            capabilities.audioOverlayOnly
                ? "headphones"
                : "sparkles"
        }

        private var badgeText: String {
            capabilities.audioOverlayOnly
                ? localization.t("byoc.audioAIOnly")
                : localization.t("byoc.aiAvailable")
        }

        private var badgeColor: Color {
            capabilities.audioOverlayOnly
                ? .orange
                : DesignTokens.Primary.default
        }
    }

    /// Inline feature list showing specific AI capabilities.
    struct TVBYOCAIFeatureList: View {
        @Environment(LocalizationManager.self) private var localization
        let capabilities: BYOCCapabilities

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                if capabilities.dubbing {
                    featureChip(
                        icon: "waveform",
                        label: localization.t("byoc.aiDubbing")
                    )
                }
                if capabilities.liveSubtitles {
                    featureChip(
                        icon: "captions.bubble",
                        label: localization.t("byoc.aiSubtitles")
                    )
                }
                if capabilities.trivia {
                    featureChip(
                        icon: "questionmark.circle",
                        label: localization.t("byoc.aiTrivia")
                    )
                }
                if capabilities.interactiveSubtitles {
                    featureChip(
                        icon: "text.bubble",
                        label: localization.t("byoc.aiInteractiveSubtitles")
                    )
                }
                if capabilities.audioOverlayOnly {
                    featureChip(
                        icon: "headphones",
                        label: localization.t("byoc.audioAIOnly")
                    )
                }
            }
        }

        private func featureChip(icon: String, label: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
            }
            .foregroundStyle(DesignTokens.Text.secondary)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(Capsule())
        }
    }

#endif
