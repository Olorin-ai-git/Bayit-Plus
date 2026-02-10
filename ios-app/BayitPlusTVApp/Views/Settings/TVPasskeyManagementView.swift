import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS passkey management view. Informational only — passkey registration
/// requires biometric authentication not available on Apple TV.
struct TVPasskeyManagementView: View {
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

                Image(systemName: "person.badge.key.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("passkeys.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("passkeys.description"))
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
                Text(localization.t("passkeys.tvLimitation"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("passkeys.tvLimitationDescription"))
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
            Circle()
                .fill(DesignTokens.Text.disabled)
                .frame(width: 16, height: 16)

            Text(localization.t("passkeys.tvNotAvailable"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
