import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subscription screen showing feature comparison and
/// directing users to bayit.tv or mobile to subscribe.
struct TVSubscriptionView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: SubscriptionViewModel?
    @State private var creditBalance: CreditBalance?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    creditBalanceCard

                    if viewModel?.isSubscribed == true {
                        subscribedBanner
                    } else {
                        featureComparisonSection
                        subscribeCallToAction
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.xxl)
                .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
                .frame(maxWidth: 1200)
                .frame(maxWidth: .infinity)
            }
        }
        .onExitCommand { dismiss() }
        .task {
            if viewModel == nil {
                viewModel = SubscriptionViewModel(
                    storeManager: repos.storeManager,
                    localization: localization
                )
            }
            await viewModel?.load()
            creditBalance = try? await repos.betaCredits.fetchBalance()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "crown.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("subscription.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("subscription.gate.upgradeList"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Subscribed Banner

    private var subscribedBanner: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Success.default)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t("subscription.activePlus"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("subscription.manageInSettings"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Feature Comparison

    private var featureComparisonSection: some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xl) {
            featureTierCard(
                title: localization.t("profile.basic"),
                icon: "person.fill",
                color: DesignTokens.Text.muted,
                features: [
                    (localization.t("settings.subscription.featureAIFree"), "sparkles"),
                    (localization.t("settings.subscription.featureWidgetsFree"), "square.grid.2x2"),
                    (localization.t("settings.subscription.featureProfilesFree"), "person.2"),
                ]
            )

            featureTierCard(
                title: localization.t("profile.premium"),
                icon: "crown.fill",
                color: DesignTokens.Primary.p400,
                features: [
                    (localization.t("settings.subscription.featureAIPlus"), "sparkles"),
                    (localization.t("settings.subscription.featureWidgetsPlus"), "square.grid.2x2"),
                    (localization.t("settings.subscription.featureProfilesPlus"), "person.2"),
                    (localization.t("settings.subscription.featureSupport"), "headphones"),
                ],
                isHighlighted: true
            )
        }
        .focusable(false)
        .allowsHitTesting(false)
    }

    private func featureTierCard(
        title: String, icon: String, color: Color,
        features: [(String, String)], isHighlighted: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ForEach(features, id: \.0) { feature in
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: feature.1)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(color)
                        .frame(width: 28)
                    Text(feature.0)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    isHighlighted ? DesignTokens.Primary.p400 : Color.clear,
                    lineWidth: 2
                )
        )
        .focusable(false)
    }

    // MARK: - Subscribe CTA

    private var subscribeCallToAction: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "iphone.and.arrow.forward")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("subscription.tvSubscribeMessage"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text("bayit.tv")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)

            GlassButton(
                localization.t("common.done"),
                variant: .secondary,
                size: .large
            ) {
                dismiss()
            }
        }
        .padding(.top, TVDesignTokens.Spacing.md)
    }

    // MARK: - Credit Balance

    @ViewBuilder
    private var creditBalanceCard: some View {
        if let balance = creditBalance {
            let total = balance.totalCredits ?? 0
            let remaining = balance.remainingCredits ?? 0
            let progress = total > 0 ? Double(remaining) / Double(total) : 0
            let statusColor: Color = balance.isCritical == true
                ? DesignTokens.ErrorColor.default
                : balance.isLow == true
                ? DesignTokens.Warning.default
                : DesignTokens.Success.default

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "sparkles")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(statusColor)
                    Text(localization.t(
                        "plus.badge.creditsRemaining",
                        ["count": String(remaining)]
                    ))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Text("\(remaining) / \(total)")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1)).frame(height: 6)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(statusColor)
                            .frame(width: geo.size.width * progress, height: 6)
                    }
                }
                .frame(height: 6)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .focusable(false)
            .allowsHitTesting(false)
        }
    }
}
