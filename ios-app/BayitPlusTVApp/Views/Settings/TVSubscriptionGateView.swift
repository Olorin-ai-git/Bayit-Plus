#if os(tvOS)

import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVSubscriptionGateView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let contentId: String
    let requiredTier: String
    let onDismiss: () -> Void

    @State private var viewModel: SubscriptionGateViewModel?
    @State private var selectedPlanId: String?

    var body: some View {
        ZStack {
            DesignTokens.Glass.bg
                .ignoresSafeArea()

            if let viewModel {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.error {
                    errorView(error)
                } else {
                    contentView(viewModel)
                }
            }
        }
        .task {
            await initializeViewModel()
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)
            Text(localization.t("subscription.loading"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.ErrorColor.default)
            Text(error)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.purpleLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func contentView(_ viewModel: SubscriptionGateViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection

            if viewModel.plans.isEmpty {
                emptyPlansView
            } else {
                plansSection(viewModel)
            }

            actionButtonsSection
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(DesignTokens.Glass.purpleLight)

                Text(localization.t("subscription.premiumContent"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .buttonStyle(.card)
                .tvFocusStyle()
            }

            Text(localization.t("subscription.upgradeRequired"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var emptyPlansView: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "rectangle.stack")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("subscription.noPlans"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func plansSection(_ viewModel: SubscriptionGateViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(viewModel.plans, id: \.id) { plan in
                    planCard(plan, isRecommended: viewModel.isRecommended(plan))
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
        }
    }

    private func planCard(_ plan: SubscriptionPlan, isRecommended: Bool) -> some View {
        let isSelected = selectedPlanId == plan.id

        return Button {
            selectedPlanId = plan.id
        } label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if isRecommended {
                    HStack {
                        Spacer()
                        Text(localization.t("subscription.recommended"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.md)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                            .background(DesignTokens.Glass.purpleLight)
                            .clipShape(Capsule())
                        Spacer()
                    }
                }

                Text(plan.name)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(String(format: "$%.2f", plan.price))
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Glass.purpleLight)

                if !plan.features.isEmpty {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                                ForEach(plan.features, id: \.self) { feature in
                            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Glass.purpleLight)

                                Text(feature)
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .multilineTextAlignment(.leading)
                            }
                        }
                    }
                }

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(width: 450, height: 550)
            .background(isSelected ? DesignTokens.Glass.bgLight : DesignTokens.Background.elevated)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(isSelected ? DesignTokens.Glass.purpleLight : Color.clear, lineWidth: 4)
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var actionButtonsSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Button {
                handleRestorePurchase()
            } label: {
                Text(localization.t("subscription.restorePurchase"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(DesignTokens.Background.elevated)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    private func initializeViewModel() async {
        viewModel = SubscriptionGateViewModel(
            settingsRepository: repos.settings,
            contentId: contentId,
            requiredTier: requiredTier
        )
        await viewModel?.load()
    }

    private func handleRestorePurchase() {
        // StoreKit restore handled at app level
    }
}

#endif
