import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Active sessions / device management screen for tvOS.
struct TVActiveSessionsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let onDismiss: () -> Void

    @State private var devices: [DeviceInfo] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                loadingView
            } else if let error {
                errorView(error)
            } else if devices.isEmpty {
                emptyView
            } else {
                deviceListView
            }
        }
        .task { await loadDevices() }
    }

    private var deviceListView: some View {
        ScrollView {
            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(devices) { device in
                    deviceRow(device)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    private func deviceRow(_ device: DeviceInfo) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: deviceIcon(device.platform))
                .font(.system(size: 32))
                .foregroundStyle(device.isCurrent == true
                    ? DesignTokens.Primary.p400
                    : DesignTokens.Text.secondary)
                .frame(width: 44)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Text(device.deviceName ?? localization.t("profile.unknown"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if device.isCurrent == true {
                        Text(localization.t("profile.devices.thisDevice"))
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, 2)
                            .background(DesignTokens.Primary.p400)
                            .clipShape(Capsule())
                    }
                }

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let platform = device.platform {
                        Text(platform.capitalized)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    if let lastActive = device.lastActive {
                        Text(lastActive)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }

            Spacer()

            if device.isCurrent != true {
                Button {
                    Task { await removeDevice(device.id) }
                } label: {
                    Text(localization.t("profile.devices.disconnect"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                        .background(DesignTokens.Colors.Semantic.error.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private func deviceIcon(_ platform: String?) -> String {
        switch platform?.lowercased() {
        case "ios": return "iphone"
        case "tvos": return "appletv"
        case "android": return "phone"
        case "web": return "globe"
        case "macos": return "desktopcomputer"
        default: return "display"
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(2.0)
            Text(localization.t("profile.devices.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Button { Task { await loadDevices() } } label: {
                Text(localization.t("common.retry"))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "display")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("profile.devices.noDevices"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("profile.devices.noDevicesDescription"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func loadDevices() async {
        isLoading = true
        error = nil
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

    private func removeDevice(_ deviceId: String) async {
        do {
            _ = try await repos.settings.removeDevice(deviceId: deviceId)
            devices.removeAll { $0.id == deviceId }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }
}
