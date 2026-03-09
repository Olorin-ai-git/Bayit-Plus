import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Zeh Ani demo: pre-rendered Magic Mirror video only.
/// Apple TV has no front camera, so this plays a demo video
/// with descriptive text explaining the feature.
struct TVZehAniDemoView: View {
    @Environment(LocalizationManager.self) var localization

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            videoSection
            descriptionPanel
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Video

    private var videoSection: some View {
        ZStack(alignment: .topLeading) {
            InlineVideoPlayer(assetName: "demo_zeh_ani.mp4")
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(
                            DesignTokens.Colors.Primary.base.opacity(0.3),
                            lineWidth: 2
                        )
                )

            featureBadge
                .padding(TVDesignTokens.Spacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var featureBadge: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.sm))
            Text(localization.t("onboarding.tour.zehAni.title"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
        }
        .foregroundStyle(DesignTokens.Text.primary)
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }

    // MARK: - Description

    private var descriptionPanel: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("onboarding.tour.zehAni.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.tour.zehAni.tagline"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Colors.Primary.light)

            Text(localization.t("onboarding.tour.zehAni.description"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer()

            tvNote
        }
        .frame(maxWidth: 480)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var tvNote: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "appletv")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("onboarding.tour.zehAni.tvNote"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }
}
