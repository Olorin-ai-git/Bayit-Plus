#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCouponShopView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.availableCoupons.isEmpty {
                    loadingState
                } else if let error = vm.errorMessage, vm.availableCoupons.isEmpty {
                    tvErrorState(error, retryLabel: localization.t("common.retry")) {
                        Task { await vm.fetchCoupons() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .fullScreenCover(isPresented: redemptionSheetBinding) {
            if let code = viewModel?.lastRedemptionCode {
                TVCouponRedemptionSheet(redemptionCode: code) {
                    viewModel?.dismissRedemption()
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = MissionsViewModel(repository: repos.missions)
            }
            await viewModel?.fetchWalletBalance()
            await viewModel?.fetchCoupons()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            shopHeader(vm)
            couponsGrid(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func shopHeader(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "cart.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("missions.shop.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let balance = vm.walletBalance {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "shekel.sign.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Warning.default)

                    Text("\(balance.balance)")
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("missions.shekels"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func couponsGrid(_ vm: MissionsViewModel) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap)
            ],
            spacing: TVDesignTokens.Spacing.focusGap
        ) {
            ForEach(vm.availableCoupons) { coupon in
                TVCouponCardView(
                    coupon: coupon,
                    viewModel: vm,
                    onRedeem: {
                        Task { await vm.redeemCoupon(id: coupon.id) }
                    }
                )
            }
        }
    }

    private var redemptionSheetBinding: Binding<Bool> {
        Binding(
            get: { viewModel?.lastRedemptionCode != nil },
            set: { if !$0 { viewModel?.dismissRedemption() } }
        )
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)

            Text(localization.t("missions.shop.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
#endif
