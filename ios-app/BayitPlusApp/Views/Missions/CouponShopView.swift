import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct CouponShopView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?
    @State private var showRedemptionAlert = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if let error = vm.errorMessage, vm.availableCoupons.isEmpty {
                        ErrorStateView(message: error) {
                            Task { await vm.fetchCoupons() }
                        }
                    } else if vm.availableCoupons.isEmpty {
                        emptyState
                    } else {
                        balanceHeader(vm)
                        couponGrid(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = MissionsViewModel(repository: repos.missions)
            }
            await viewModel?.fetchCoupons()
            await viewModel?.fetchWalletBalance()
        }
        .overlay {
            if let code = viewModel?.lastRedemptionCode {
                redemptionOverlay(code: code)
            }
        }
    }

    private func balanceHeader(_ vm: MissionsViewModel) -> some View {
        GlassCard {
            HStack {
                Image(systemName: "circlebadge.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text("\(vm.walletBalance?.balance ?? 0)")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("wallet.shekelsAvailable"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func couponGrid(_ vm: MissionsViewModel) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
            ],
            spacing: DesignTokens.Spacing.md
        ) {
            ForEach(vm.availableCoupons) { coupon in
                couponCard(coupon, vm: vm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func couponCard(_ coupon: Coupon, vm: MissionsViewModel) -> some View {
        let canAfford = (vm.walletBalance?.balance ?? 0) >= coupon.costShekels
        let isRedeeming = vm.isRedeemingCouponId == coupon.id

        return GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                if let urlStr = coupon.imageUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if case .success(let img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            couponImageFallback
                        }
                    }
                    .frame(height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                } else {
                    couponImageFallback
                }

                Text(coupon.partnerName)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(coupon.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)

                HStack {
                    Image(systemName: "circlebadge.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.Warning.default)
                    Text("\(coupon.costShekels)")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                }

                GlassButton(
                    localization.t("coupons.redeem"),
                    variant: canAfford ? .primary : .secondary,
                    size: .small
                ) {
                    Task { await vm.redeemCoupon(id: coupon.id) }
                }
                .disabled(!canAfford || isRedeeming)
            }
        }
    }

    private var couponImageFallback: some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 100)
            Image(systemName: "tag.fill")
                .font(.system(size: 28))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var emptyState: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "tag.slash")
                    .font(.system(size: 40))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("coupons.noneAvailable"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.vertical, DesignTokens.Spacing.xxl)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func redemptionOverlay(code: String) -> some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.Success.default)

                    Text(localization.t("coupons.redeemed"))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(code)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold, design: .monospaced))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .padding(DesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                    GlassButton(
                        localization.t("common.done"),
                        variant: .primary,
                        size: .medium
                    ) {
                        viewModel?.lastRedemptionCode = nil
                    }
                }
                .padding(DesignTokens.Spacing.xl)
            }
            .frame(maxWidth: 320)
        }
    }
}
