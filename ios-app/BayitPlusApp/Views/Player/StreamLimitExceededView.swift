#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Modal shown when user exceeds maximum concurrent streams.
struct StreamLimitExceededView: View {

    let maxStreams: Int
    let activeDevices: [ActiveDevice]
    let onDisconnect: (String) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "tv.and.mediabox")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Warning.default)

            Text("Stream Limit Reached")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("You can watch on up to \(maxStreams) devices at once. Disconnect a device to continue.")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if !activeDevices.isEmpty {
                deviceList
            }

            GlassButton("Close", variant: .ghost) {
                onDismiss()
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .background(DesignTokens.Background.elevated)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .shadow(color: .black.opacity(0.3), radius: 20)
        .padding(.horizontal, DesignTokens.Spacing.xl)
    }

    private var deviceList: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(activeDevices) { device in
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: deviceIcon(device.type))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(device.name ?? "Unknown Device")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if let lastActive = device.lastActive {
                            Text(lastActive)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    GlassButton("Disconnect", variant: .secondary, size: .small) {
                        onDisconnect(device.id)
                    }
                }
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
        }
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
