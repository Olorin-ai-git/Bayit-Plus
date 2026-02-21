import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS security settings screen with password management and device list.
/// Reuses SecurityViewModel from shared ViewModels.
struct TVSecurityView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: SecurityViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
                    if vm.isLoading && vm.devices.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.devices.isEmpty {
                        errorState(error, vm: vm)
                    } else {
                        passwordSection(vm)
                        devicesSection(vm)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SecurityViewModel(repository: repos.settings)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    // MARK: - Error

    private func errorState(_ message: String, vm: SecurityViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton(localization.t("common.retry"), variant: .secondary, size: .large) {
                Task { await vm.load() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Password

    private func passwordSection(_ vm: SecurityViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("security.changePassword"))

            VStack(spacing: TVDesignTokens.Spacing.md) {
                secureField(
                    placeholder: localization.t("security.currentPassword"),
                    text: Bindable(vm).currentPassword
                )
                secureField(
                    placeholder: localization.t("security.newPassword"),
                    text: Bindable(vm).newPassword
                )
                secureField(
                    placeholder: localization.t("security.confirmPassword"),
                    text: Bindable(vm).confirmPassword
                )

                if let success = vm.successMessage {
                    Text(success)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Success.default)
                }

                if let error = vm.error {
                    Text(error)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }

                GlassButton(
                    localization.t("security.updatePassword"),
                    variant: .primary,
                    isDisabled: !vm.passwordsValid,
                    isLoading: vm.isProcessing
                ) {
                    Task { await vm.changePassword() }
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    private func secureField(
        placeholder: String, text: Binding<String>
    ) -> some View {
        SecureField(placeholder, text: text)
            .textContentType(.password)
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .foregroundStyle(DesignTokens.Text.primary)
    }

    // MARK: - Helpers

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
