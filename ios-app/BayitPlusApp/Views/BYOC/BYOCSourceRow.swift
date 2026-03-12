import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Single connected source row with remove action and auth status.
struct BYOCSourceRow: View {
    @Environment(LocalizationManager.self) private var localization

    let source: BYOCSourceConfig
    let onRemove: () -> Void
    var onReauth: (() -> Void)?

    var body: some View {
        GlassCard {
            VStack(spacing: 0) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: iconName)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(iconColor)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(source.name)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(statusLabel)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(statusColor)
                    }

                    Spacer()

                    Button(action: onRemove) {
                        Image(systemName: "trash")
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
                .padding(DesignTokens.Spacing.md)

                if source.status == .authExpired, let onReauth {
                    Divider().overlay(DesignTokens.Glass.border)
                    Button(action: onReauth) {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                            Text(localization.t("byoc.reconnect"))
                        }
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                    }
                }
            }
        }
    }

    private var statusLabel: String {
        switch source.status {
        case .authExpired:
            return localization.t("byoc.authExpired")
        case .error:
            return localization.t("byoc.connectionError")
        case .active:
            return sourceTypeLabel
        }
    }

    private var statusColor: Color {
        switch source.status {
        case .authExpired: return DesignTokens.Warning.default
        case .error: return DesignTokens.ErrorColor.default
        case .active: return DesignTokens.Text.muted
        }
    }

    private var iconName: String {
        switch source.type {
        case .iptv: return "antenna.radiowaves.left.and.right"
        case .xtream: return "tv.and.mediabox"
        case .plex: return "server.rack"
        case .youtube: return "play.rectangle.fill"
        }
    }

    private var iconColor: Color {
        switch source.type {
        case .iptv: return DesignTokens.Primary.default
        case .xtream: return .purple
        case .plex: return .orange
        case .youtube: return .red
        }
    }

    private var sourceTypeLabel: String {
        switch source.type {
        case .iptv: return localization.t("byoc.iptv")
        case .xtream: return localization.t("byoc.addXtream")
        case .plex: return localization.t("byoc.plex")
        case .youtube: return localization.t("byoc.youtube")
        }
    }
}
