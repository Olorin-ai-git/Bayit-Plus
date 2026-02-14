import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Radio stations row on the home screen
struct RadioStationsRow: View {
    @Environment(LocalizationManager.self) private var localization
    let stations: [RadioStationItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("radio.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: stations, itemWidth: 140) { station in
                GlassContentCard(
                    thumbnailURL: station.logo,
                    title: station.name,
                    subtitle: station.currentSong ?? station.currentShow,
                    aspectRatio: 1.0,
                    width: 140,
                    placeholderIcon: .radio
                ) {
                    coordinator.navigate(to: .player(
                        contentId: station.id,
                        contentType: .radio
                    ))
                }
            }
        }
    }
}
