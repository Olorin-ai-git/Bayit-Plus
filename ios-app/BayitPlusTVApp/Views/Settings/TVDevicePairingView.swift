import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS device pairing view. Informational only -- device pairing
/// requires QR code scanning and text input best suited to iPhone or iPad.
struct TVDevicePairingView: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                infoSection
                statusSection
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 120, height: 120)

                Image(systemName: "link.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("pairing.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("pairing.tvDescription"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Info

    private var infoSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "info.circle")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t("pairing.tvPairFromMobile"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("pairing.tvExplanation"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Status

    private var statusSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "iphone.and.arrow.right.inward")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.disabled)

            Text(localization.t("pairing.tvPairPrompt"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
