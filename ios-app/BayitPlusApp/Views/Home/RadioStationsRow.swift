import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Radio stations row on the home screen
struct RadioStationsRow: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(AudioPlaybackManager.self) private var audioManager
    let stations: [RadioStationItem]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("radio.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: stations, itemWidth: 140) { station in
                let isActive = audioManager.activeContentId == station.id && audioManager.isActive
                GlassContentCard(
                    thumbnailURL: station.logo,
                    title: station.name,
                    subtitle: station.currentSong ?? station.currentShow,
                    badge: isActive ? "LIVE" : nil,
                    aspectRatio: 1.0,
                    width: 140,
                    placeholderIcon: .radio,
                    onTap: {
                        audioManager.play(contentId: station.id, contentType: .radio)
                    }
                )
            }
        }
    }
}
