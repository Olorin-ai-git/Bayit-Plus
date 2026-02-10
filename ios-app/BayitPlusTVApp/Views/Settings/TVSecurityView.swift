import BayitDesignSystem
import SwiftUI

/// tvOS security settings screen with password management and device list.
/// Reuses SecurityViewModel from shared ViewModels.
struct TVSecurityView: View {
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
            Text("Loading Security...")
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

            GlassButton("Retry", variant: .secondary, size: .large) {
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
            sectionHeader("Change Password")

            VStack(spacing: TVDesignTokens.Spacing.md) {
                secureField(
                    placeholder: "Current Password",
                    text: Bindable(vm).currentPassword
                )
                secureField(
                    placeholder: "New Password",
                    text: Bindable(vm).newPassword
                )
                secureField(
                    placeholder: "Confirm Password",
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
                    "Update Password",
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

    // MARK: - Devices

    private func devicesSection(_ vm: SecurityViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader("Active Devices")

            if vm.devices.isEmpty {
                Text("No active devices found.")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(TVDesignTokens.Spacing.xl)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            } else {
                ForEach(vm.devices) { device in
                    deviceRow(device, vm: vm)
                }
            }
        }
    }

    private func deviceRow(_ device: DeviceInfo, vm: SecurityViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: deviceIcon(device.deviceType))
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 56)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(device.deviceName ?? "Unknown Device")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if device.isCurrent == true {
                        GlassBadge(text: "Current", variant: .success)
                    }
                }

                Text(device.lastActive ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            if device.isCurrent != true {
                Button {
                    Task { await vm.removeDevice(device) }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
                .buttonStyle(.plain)
                .tvFocusStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func deviceIcon(_ type: String?) -> String {
        switch type {
        case "mobile": return "iphone"
        case "tablet": return "ipad"
        case "tv": return "appletv"
        case "desktop": return "desktopcomputer"
        default: return "display"
        }
    }
}
