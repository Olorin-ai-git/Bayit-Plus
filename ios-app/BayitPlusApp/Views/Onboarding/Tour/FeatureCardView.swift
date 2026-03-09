import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Individual feature card in the onboarding tour. Shows a looping video
/// preview with a Glass overlay containing title, tagline, and "Try It Now".
struct FeatureCardView: View {
    let card: FeatureTourViewModel.FeatureCard
    let onTryDemo: () -> Void
    @Environment(LocalizationManager.self) var localization

    var body: some View {
        ZStack(alignment: .bottom) {
            videoBackground
            cardOverlay
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(localization.t(card.titleKey))
    }

    private var videoBackground: some View {
        InlineVideoPlayer(assetName: card.videoAsset)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(
                LinearGradient(
                    colors: [.clear, .black.opacity(0.7)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            )
    }

    private var cardOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Text(localization.t(card.titleKey))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .multilineTextAlignment(.center)

            Text(localization.t(card.taglineKey))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("onboarding.tour.tryItNow"),
                variant: .primary,
                size: .medium
            ) {
                onTryDemo()
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
    }
}
