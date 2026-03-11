#if os(tvOS)

    import BayitDesignSystem
    import BayitLocalization
    import StoreKit
    import SwiftUI

    struct TVSubscriptionGateView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) var localization

        let contentId: String
        let requiredTier: String
        let onDismiss: () -> Void

        @State private var viewModel: SubscriptionGateViewModel?
        @State var selectedPlanId: String?

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
                .tvCardStyle()
            }
            .padding(TVDesignTokens.Spacing.xl)
        }

        private func contentView(_ viewModel: SubscriptionGateViewModel) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection

                if !viewModel.hasProducts {
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
                    .tvCardStyle()
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
                    if let monthly = viewModel.monthlyProduct {
                        productCard(monthly, isRecommended: false)
                    }
                    if let yearly = viewModel.yearlyProduct {
                        productCard(yearly, isRecommended: true)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.md)
            }
        }

        private func productCard(_ product: Product, isRecommended: Bool) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack {
                    Text(product.displayName)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    if isRecommended {
                        Text(localization.t("subscription.recommended"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, TVDesignTokens.Spacing.xxs)
                            .background(DesignTokens.Primary.default)
                            .clipShape(Capsule())
                    }
                }
                Text(product.displayPrice)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(product.description)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(isRecommended ? DesignTokens.Primary.default : Color.clear, lineWidth: 2)
            )
        }

        private func initializeViewModel() async {
            viewModel = SubscriptionGateViewModel(
                storeManager: repos.storeManager,
                localization: localization,
                contentId: contentId,
                requiredTier: requiredTier
            )
            await viewModel?.load()
        }
    }

#endif
