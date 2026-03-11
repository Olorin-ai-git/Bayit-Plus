import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Security settings screen with device management and password change.
struct SecurityView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SecurityViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.devices.isEmpty {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.devices.isEmpty {
                        ErrorStateView(message: error) { Task { await vm.load() } }
                    } else {
                        passwordSection(vm)
                        devicesSection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SecurityViewModel(repository: repos.settings, localization: localization)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Password

    private func passwordSection(_ vm: SecurityViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("security.changePassword"))

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
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
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Success.default)
                    }

                    if let error = vm.error {
                        Text(error)
                            .font(.system(size: DesignTokens.FontSize.sm))
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
                .padding(DesignTokens.Spacing.lg)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func secureField(
        placeholder: String, text: Binding<String>
    ) -> some View {
        SecureField(placeholder, text: text)
            .textContentType(.password)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .foregroundStyle(DesignTokens.Text.primary)
    }

    // MARK: - Devices

    private func devicesSection(_ vm: SecurityViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("security.devices"))

            if vm.devices.isEmpty {
                GlassCard {
                    Text(localization.t("security.noDevices"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(DesignTokens.Spacing.xl)
                }
            } else {
                ForEach(vm.devices) { device in
                    deviceRow(device, vm: vm)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func deviceRow(_ device: DeviceInfo, vm: SecurityViewModel) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: deviceIcon(device.deviceType))
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(device.deviceName ?? localization.t("security.unknownDevice"))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if device.isCurrent == true {
                            GlassBadge(text: localization.t("security.current"), variant: .success)
                        }
                    }

                    Text(device.lastActive ?? "")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if device.isCurrent != true {
                    Button {
                        Task { await vm.removeDevice(device) }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
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
