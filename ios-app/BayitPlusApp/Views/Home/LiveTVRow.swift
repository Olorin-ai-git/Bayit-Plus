import BayitDesignSystem
import SwiftUI

/// Live TV channels row on the home screen
struct LiveTVRow: View {
    let channels: [LiveChannelItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Live TV")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: channels, itemWidth: 140) { channel in
                GlassContentCard(
                    thumbnailURL: channel.logo ?? channel.thumbnail,
                    title: channel.name,
                    subtitle: channel.currentShow,
                    badge: "LIVE",
                    aspectRatio: 1.0,  // Square
                    width: 140
                ) {
                    coordinator.navigate(to: .player(
                        contentId: channel.id,
                        contentType: .liveTV
                    ))
                }
            }
        }
    }
}
