#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCouponRedemptionSheet: View {
    @Environment(LocalizationManager.self) private var localization

    let redemptionCode: String
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 120))
                    .foregroundStyle(DesignTokens.Success.default)

                Text(localization.t("missions.shop.redeemed"))
                    .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                VStack(spacing: TVDesignTokens.Spacing.md) {
                    Text(localization.t("missions.shop.redemptionCode"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    Text(redemptionCode)
                        .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .padding(TVDesignTokens.Spacing.xl)
                        .background(DesignTokens.Glass.bgStrong)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                }

                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("common.close"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .frame(width: 300, height: 60)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                }
                .tvCardStyle()
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
    }
}
#endif
