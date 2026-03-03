import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Devices Section

extension TVSecurityView {
    func devicesSection(_ vm: SecurityViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("security.devices"))

            if vm.devices.isEmpty {
                Text(localization.t("security.noDevices"))
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

    func deviceRow(_ device: DeviceInfo, vm: SecurityViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: deviceIcon(device.deviceType))
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 56)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(device.deviceName ?? localization.t("security.unknownDevice"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if device.isCurrent == true {
                        GlassBadge(text: localization.t("security.current"), variant: .success)
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
                .tvCardStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    func deviceIcon(_ type: String?) -> String {
        switch type {
        case "mobile": return "iphone"
        case "tablet": return "ipad"
        case "tv": return "appletv"
        case "desktop": return "desktopcomputer"
        default: return "display"
        }
    }
}
