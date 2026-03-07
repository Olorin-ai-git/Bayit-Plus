import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Single connected source row with remove action.
struct BYOCSourceRow: View {
    @Environment(LocalizationManager.self) private var localization

    let source: BYOCSourceConfig
    let onRemove: () -> Void

    var body: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: iconName)
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(iconColor)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(source.name)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(sourceTypeLabel)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                Button(action: onRemove) {
                    Image(systemName: "trash")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
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
