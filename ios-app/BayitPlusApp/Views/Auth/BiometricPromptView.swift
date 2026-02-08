import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Face ID / Touch ID authentication prompt with app icon and glass styling.
///
/// Displays the appropriate biometric icon, an authentication button,
/// and a toggle to enable/disable biometric authentication for the account.
struct BiometricPromptView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: BiometricViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if !vm.isBiometricAvailable {
                    unavailableState
                } else {
                    content(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = BiometricViewModel(
                    securityRepository: repos.securitySettings
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Content

    private func content(_ vm: BiometricViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xxl) {
            Spacer()
                .frame(height: DesignTokens.Spacing.xxxxl)

            biometricIcon(vm)
            statusSection(vm)
            actionSection(vm)
            toggleSection(vm)

            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Icon

    private func biometricIcon(_ vm: BiometricViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: vm.biometricIconName)
                    .font(.system(size: 64))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .symbolEffect(.pulse, isActive: vm.isAuthenticating)

                Text(vm.biometricLabel)
                    .font(.system(
                        size: DesignTokens.FontSize.xxl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Status

    private func statusSection(_ vm: BiometricViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if vm.isAuthenticated {
                GlassAlert(
                    type: .success,
                    title: localization.t("biometric.authenticated")
                )
            }

            if let error = vm.error {
                GlassAlert(
                    type: .error,
                    title: error
                )
            }
        }
    }

    // MARK: - Action

    private func actionSection(_ vm: BiometricViewModel) -> some View {
        GlassButton(
            localization.t("biometric.authenticate"),
            variant: .primary,
            size: .large,
            isLoading: vm.isAuthenticating,
            icon: Image(systemName: vm.biometricIconName)
        ) {
            Task {
                await vm.authenticate(
                    reason: localization.t("biometric.reason")
                )
            }
        }
    }

    // MARK: - Toggle

    private func toggleSection(_ vm: BiometricViewModel) -> some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(
                        localization.t("biometric.enableToggle",
                                       ["type": vm.biometricLabel])
                    )
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("biometric.enableDescription"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if vm.isProcessing {
                    ProgressView()
                        .tint(.white)
                } else {
                    Toggle("", isOn: .init(
                        get: { vm.isBiometricEnabled },
                        set: { _ in
                            Task { await vm.toggleBiometric() }
                        }
                    ))
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
                }
            }
        }
    }

    // MARK: - Unavailable

    private var unavailableState: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()
                .frame(height: 100)

            Image(systemName: "lock.shield")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Text.disabled)

            Text(localization.t("biometric.unavailable"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            Text(localization.t("biometric.unavailableDescription"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
