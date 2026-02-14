#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS modal shown when user exceeds maximum concurrent streams.
/// Focus-based dismiss and device disconnect actions.
struct TVStreamLimitExceededView: View {
    @Environment(LocalizationManager.self) private var localization

    let maxStreams: Int
    let activeDevices: [ActiveDevice]
    let onDisconnect: (String) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "tv.and.mediabox")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("streamLimit.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("streamLimit.message"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            if !activeDevices.isEmpty {
                deviceList
            }

            GlassButton("Close", variant: .ghost, size: .large) { onDismiss() }
                .tvFocusStyle()
        }
        .padding(TVDesignTokens.Spacing.xxxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }

    private var deviceList: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(activeDevices) { device in
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: deviceIcon(device.type))
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 40)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(device.name ?? "Unknown Device")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if let lastActive = device.lastActive {
                            Text(lastActive)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    GlassButton("Disconnect", variant: .secondary, size: .medium) {
                        onDisconnect(device.id)
                    }
                    .tvFocusStyle()
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
        }
        .frame(maxWidth: 700)
    }

    private func deviceIcon(_ type: String?) -> String {
        switch type {
        case "mobile": return "iphone"
        case "tablet": return "ipad"
        case "tv": return "appletv"
        case "web": return "laptopcomputer"
        default: return "display"
        }
    }
}
#endif
