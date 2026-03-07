#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Card displaying a configured BYOC source with remove action.
    struct TVBYOCSourceCard: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization
        let source: BYOCSourceConfig
        let onRemove: () -> Void

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                sourceIcon
                sourceInfo
                Spacer()
                channelBadge
                removeButton
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private var sourceIcon: some View {
            Image(systemName: iconName)
                .font(.system(size: 32))
                .foregroundStyle(iconColor)
                .frame(width: 50)
        }

        private var sourceInfo: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(source.name)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(sourceTypeLabel)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)

                if let refreshed = source.lastRefreshedAt {
                    Text(refreshed, style: .relative)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }

        @ViewBuilder
        private var channelBadge: some View {
            let count = channelCount
            if count > 0 {
                Text(String(format: localization.t("byoc.channelCount"), count))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Capsule())
            }
        }

        private var removeButton: some View {
            Button(action: onRemove) {
                Image(systemName: "trash.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .tvCardStyle()
        }

        private var iconName: String {
            switch source.type {
            case .iptv: return "antenna.radiowaves.left.and.right"
            case .plex: return "server.rack"
            case .youtube: return "play.rectangle.fill"
            }
        }

        private var iconColor: Color {
            switch source.type {
            case .iptv: return DesignTokens.Primary.p400
            case .plex: return .orange
            case .youtube: return .red
            }
        }

        private var sourceTypeLabel: String {
            switch source.type {
            case .iptv: return localization.t("byoc.iptv")
            case .plex: return localization.t("byoc.plex")
            case .youtube: return localization.t("byoc.youtube")
            }
        }

        private var channelCount: Int {
            switch source.type {
            case .iptv:
                return byocManager.iptvChannels.filter { $0.sourceId == source.id }.count
            case .plex:
                return byocManager.plexItems.filter { $0.sourceId == source.id }.count
            case .youtube:
                return byocManager.youtubeItems.filter { $0.sourceId == source.id }.count
            }
        }
    }

#endif
