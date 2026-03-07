import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays user's IPTV channels grouped by category below the broadcast channels.
struct TVIPTVChannelsSection: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVNavigationCoordinator.self) private var coordinator

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        if !byocManager.iptvChannels.isEmpty {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                sectionHeader
                channelGroups
            }
            .padding(.top, TVDesignTokens.Spacing.xl)
        }
    }

    private var sectionHeader: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("byoc.yourChannels"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.leading, TVDesignTokens.Spacing.xl)
    }

    private var channelGroups: some View {
        ForEach(byocManager.iptvGroups) { group in
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(group.name)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.leading, TVDesignTokens.Spacing.xl)

                LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(group.channels) { channel in
                        TVIPTVChannelCard(channel: channel) {
                            coordinator.presentPlayer(
                                contentId: channel.id,
                                contentType: .liveTV,
                                directUrl: channel.streamURL.absoluteString
                            )
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }
}
