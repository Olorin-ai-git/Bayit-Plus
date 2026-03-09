import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Subscription gate screen shown when content requires a higher tier.
/// Displays lock header, content preview, trial offer, plan comparison,
/// and subscribe actions.
struct SubscriptionGateView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SubscriptionGateViewModel?
    @State private var selectedBillingPeriod: BillingPeriod = .monthly

    let contentId: String
    let requiredTier: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.plans.isEmpty {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.plans.isEmpty {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        lockHeader
                        trialBanner
                        planCards(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SubscriptionGateViewModel(
                    settingsRepository: repos.settings,
                    contentId: contentId,
                    requiredTier: requiredTier
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Lock Header

    private var lockHeader: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "lock.fill")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("gate.contentLocked"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("gate.upgradeRequired"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Trial Banner

    private var trialBanner: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "gift.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p300)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("gate.trialTitle"))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("gate.trialSubtitle"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p500, DesignTokens.Secondary.s500],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Plan Cards

    private func planCards(_ vm: SubscriptionGateViewModel) -> some View {
        ForEach(vm.plans) { plan in
            planCard(plan, viewModel: vm)
        }
    }

    private func planCard(
        _ plan: SubscriptionPlan,
        viewModel vm: SubscriptionGateViewModel
    ) -> some View {
        let recommended = vm.isRecommended(plan)

        return GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(plan.name)
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    if recommended {
                        GlassBadge(
                            text: localization.t("gate.recommended"),
                            variant: .primary
                        )
                    }
                }

                Text(formattedPrice(plan))
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.default)

                ForEach(plan.features, id: \.self) { feature in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(DesignTokens.Success.default)

                        Text(feature)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                GlassButton(
                    recommended
                        ? localization.t("gate.startTrial")
                        : localization.t("gate.subscribe"),
                    variant: recommended ? .primary : .secondary,
                    isLoading: vm.isProcessing
                ) {
                    Task {
                        guard !vm.isProcessing else { return }
                        HapticFeedbackService.impact(style: .medium)
                        if let url = await vm.subscribe(
                            to: plan,
                            billingPeriod: selectedBillingPeriod
                        ) {
                            await UIApplication.shared.open(url)
                        }
                    }
                }
                .disabled(vm.isProcessing)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    recommended ? DesignTokens.Primary.default : Color.clear,
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Helpers

    private func formattedPrice(_ plan: SubscriptionPlan) -> String {
        switch selectedBillingPeriod {
        case .monthly:
            return String(format: "$%.2f/mo", plan.price)
        case .yearly:
            let yearly = plan.priceYearly ?? (plan.price * 10)
            return String(format: "$%.2f/yr", yearly)
        }
    }
}
