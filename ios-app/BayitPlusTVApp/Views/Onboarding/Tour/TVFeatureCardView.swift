import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS feature card with 10-foot UI typography and focus ring support.
struct TVFeatureCardView: View {
    let card: TVFeatureTourViewModel.FeatureCard
    let onTryDemo: () -> Void
    @Environment(LocalizationManager.self) var localization
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        ZStack(alignment: .bottom) {
            videoBackground
            cardOverlay
        }
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
        .animation(
            .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
            value: isFocused
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(localization.t(card.titleKey))
    }

    private var videoBackground: some View {
        InlineVideoPlayer(assetName: card.videoAsset)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(
                LinearGradient(
                    colors: [.clear, .black.opacity(0.8)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            )
    }

    private var cardOverlay: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t(card.titleKey))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t(card.taglineKey))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            Button(action: onTryDemo) {
                Text(localization.t("onboarding.tour.tryItNow"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Colors.Primary.base)
                    .clipShape(Capsule())
            }
            .buttonStyle(.card)
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
    }
}
