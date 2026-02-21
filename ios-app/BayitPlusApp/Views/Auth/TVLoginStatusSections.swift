import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVLoginView Status Section Extensions

extension TVLoginView {
    var connectedSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.success)
                .symbolEffect(.pulse)

            Text(localization.t("tvLogin.connected"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            if authManager.isAuthenticated {
                GlassButton(
                    localization.t("tvLogin.signInToTV"),
                    variant: .primary,
                    size: .large,
                    isLoading: status == .authenticating,
                    icon: Image(systemName: "arrow.right")
                ) {
                    logger.info("Sign In to TV button tapped")
                    Task { @MainActor in
                        await completeAuthentication()
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(status == .authenticating)
            } else {
                Text(localization.t("tvLogin.pleaseSignIn"))
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Text.secondary)

                GlassButton(
                    localization.t("tvLogin.signInButton"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "arrow.right")
                ) {
                    coordinator.showingAuth = true
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }

    var authenticatingSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)
                .scaleEffect(1.5)

            Text(localization.t("tvLogin.authenticating"))
                .font(.title3)
                .fontWeight(.medium)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.almostThere"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    var successSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            if #available(iOS 18.0, *) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Colors.Semantic.success)
                    .symbolEffect(.bounce)
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Colors.Semantic.success)
            }

            Text(localization.t("tvLogin.success"))
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.tvSignedIn"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("common.done"),
                variant: .primary,
                size: .large
            ) {
                coordinator.dismissTVLogin()
                coordinator.navigate(to: .home)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, DesignTokens.Spacing.md)
        }
        .padding(DesignTokens.Spacing.xl)
    }

    var errorSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)

            Text(localization.t("tvLogin.error"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }

            GlassButton(
                localization.t("common.tryAgain"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "arrow.clockwise")
            ) {
                Task { await verifyAndConnect() }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }

    var expiredSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.warning)

            Text(localization.t("tvLogin.expired"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.expiredMessage"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("tvLogin.goToHome"),
                variant: .primary,
                size: .large
            ) {
                coordinator.dismissTVLogin()
                coordinator.navigate(to: .home)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }
}
