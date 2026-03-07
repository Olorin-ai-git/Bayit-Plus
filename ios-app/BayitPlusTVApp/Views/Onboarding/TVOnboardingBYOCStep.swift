import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Onboarding step introducing BYOC (Bring Your Own Content).
/// Users can skip or connect IPTV, Plex, or YouTube sources.
struct TVOnboardingBYOCStep: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: TVOnboardingViewModel
    let onOpenSources: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            headerSection
            featureCards
            actionButtons

            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "play.tv")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.byoc.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.byoc.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Features

    private var featureCards: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            sourceCard(
                icon: "antenna.radiowaves.left.and.right",
                title: localization.t("byoc.iptv"),
                subtitle: localization.t("onboarding.byoc.iptvDesc"),
                color: DesignTokens.Primary.p400
            )
            sourceCard(
                icon: "server.rack",
                title: localization.t("byoc.plex"),
                subtitle: localization.t("onboarding.byoc.plexDesc"),
                color: .orange
            )
            sourceCard(
                icon: "play.rectangle.fill",
                title: localization.t("byoc.youtube"),
                subtitle: localization.t("onboarding.byoc.youtubeDesc"),
                color: .red
            )
        }
    }

    private func sourceCard(
        icon: String,
        title: String,
        subtitle: String,
        color: Color
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 44))
                .foregroundStyle(color)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(subtitle)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                localization.t("onboarding.byoc.connectNow"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "plus.circle")
            ) {
                onOpenSources()
            }

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                GlassButton(
                    localization.t("common.back"),
                    variant: .secondary,
                    size: .medium
                ) {
                    viewModel.previousStep()
                }

                GlassButton(
                    localization.t("onboarding.byoc.skipForNow"),
                    variant: .secondary,
                    size: .medium,
                    icon: Image(systemName: "arrow.right")
                ) {
                    viewModel.nextStep()
                }
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
