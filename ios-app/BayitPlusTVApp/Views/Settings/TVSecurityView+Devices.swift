#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Devices Panel

    struct TVSecurityDevicesPanel: View {
        let viewModel: SecurityViewModel?

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    Text(localization.t("settings.security.devices"))
                        .font(.system(size: 32, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
                        .padding(.bottom, 8)
                    if let devices = viewModel?.devices, !devices.isEmpty {
                        ForEach(devices) { deviceRow($0) }
                    } else {
                        Text(localization.t("settings.security.noDevices"))
                            .font(.system(size: 24)).foregroundStyle(DesignTokens.Text.secondary)
                            .frame(maxWidth: .infinity).padding(.vertical, 60)
                    }
                }
                .padding(.horizontal, 48).padding(.vertical, 48)
            }
        }

        private func deviceRow(_ device: DeviceInfo) -> some View {
            HStack(spacing: 20) {
                Image(systemName: icon(for: device.deviceType))
                    .font(.system(size: 28, weight: .medium)).foregroundStyle(DesignTokens.Primary.p400).frame(width: 44)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 10) {
                        Text(device.deviceName ?? localization.t("settings.security.unknownDevice"))
                            .font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                        if device.isCurrent == true {
                            GlassBadge(text: localization.t("settings.security.thisDevice"), variant: .success)
                        }
                    }
                    Text(device.lastActive ?? "").font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer(minLength: 0)
                if device.isCurrent != true {
                    Button { Task { await viewModel?.removeDevice(device) } } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28)).foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                    .tvCardStyle()
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.09), lineWidth: 1))
        }

        private func icon(for type: String?) -> String {
            switch type {
            case "mobile": return "iphone"
            case "tablet": return "ipad"
            case "tv": return "appletv"
            case "desktop": return "desktopcomputer"
            default: return "display"
            }
        }
    }
#endif
