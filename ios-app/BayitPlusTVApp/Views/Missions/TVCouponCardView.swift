#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCouponCardView: View {
    @Environment(LocalizationManager.self) private var localization

    let coupon: Coupon
    let viewModel: MissionsViewModel
    let onRedeem: () -> Void

    var body: some View {
        Button {
            onRedeem()
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                couponImage

                Text(coupon.title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                if !coupon.description.isEmpty {
                    Text(coupon.description)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                }

                Spacer()

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "shekel.sign.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Warning.default)

                    Text("\(coupon.costShekels)")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                redeemButton
            }
            .frame(width: 400, height: 500)
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .disabled(isRedeemDisabled)
    }

    private var couponImage: some View {
        Group {
            if let imageUrl = coupon.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: 200, height: 150)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 200, height: 150)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                    case .failure:
                        placeholderImage
                    @unknown default:
                        placeholderImage
                    }
                }
            } else {
                placeholderImage
            }
        }
    }

    private var placeholderImage: some View {
        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 200, height: 150)
            .overlay {
                Image(systemName: "gift.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }

    private var redeemButton: some View {
        Group {
            if viewModel.isRedeemingCouponId == coupon.id {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
            } else if let balance = viewModel.walletBalance, balance.balance < coupon.costShekels {
                Text(localization.t("missions.shop.insufficientFunds"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.disabled)
            } else {
                Text(localization.t("missions.shop.redeem"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Success.default)
            }
        }
        .frame(height: 44)
    }

    private var isRedeemDisabled: Bool {
        guard let balance = viewModel.walletBalance else { return true }
        return balance.balance < coupon.costShekels || viewModel.isRedeemingCouponId != nil
    }
}
#endif
