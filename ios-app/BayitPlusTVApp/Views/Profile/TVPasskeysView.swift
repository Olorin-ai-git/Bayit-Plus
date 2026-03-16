import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Passkey / WebAuthn management screen for tvOS.
/// Displays information about passkey-based 2FA and manages existing credentials.
struct TVPasskeysView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let onDismiss: () -> Void

    @State private var devices: [DeviceInfo] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: TVDesignTokens.Spacing.xxxl) {
                headerSection
                infoSection
                devicesSection
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
        .task { await loadDevices() }
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Success.default)

            Text(localization.t("mfa.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("mfa.description"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            infoCard(
                icon: "key.fill",
                title: localization.t("settings.passkeys"),
                description: localization.t("mfa.authenticatorDescription"),
                color: DesignTokens.Primary.p400
            )

            infoCard(
                icon: "message.fill",
                title: localization.t("mfa.sms"),
                description: localization.t("mfa.smsDescription"),
                color: DesignTokens.Info.default
            )
        }
        .frame(maxWidth: 800)
    }

    private func infoCard(icon: String, title: String, description: String, color: Color) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundStyle(color)
                .frame(width: 60)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(description)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var devicesSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("profile.connectedDevices"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if isLoading {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(TVDesignTokens.Spacing.xl)
            } else if devices.isEmpty {
                Text(localization.t("profile.devices.noDevices"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(maxWidth: .infinity)
                    .padding(TVDesignTokens.Spacing.xl)
            } else {
                ForEach(devices) { device in
                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        Image(systemName: device.isCurrent == true ? "appletv" : "display")
                            .font(.system(size: 28))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .frame(width: 44)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(device.deviceName ?? localization.t("profile.unknown"))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            if let platform = device.platform {
                                Text(platform.capitalized)
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                        }

                        Spacer()

                        if device.isCurrent == true {
                            Text(localization.t("profile.devices.thisDevice"))
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                                .padding(.vertical, 2)
                                .background(DesignTokens.Primary.p400)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
            }
        }
        .frame(maxWidth: 800)
    }

    private func loadDevices() async {
        isLoading = true
        do {
            let response = try await repos.settings.fetchDevices()
            devices = response.devices
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }
}
