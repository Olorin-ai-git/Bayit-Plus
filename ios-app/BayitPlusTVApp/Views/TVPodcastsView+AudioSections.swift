import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVPodcastsView + Radio & Audiobooks

extension TVPodcastsView {
    var radioSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("radio.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: radioColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(radioStations) { station in
                    GlassFocusPoster(
                        thumbnailURL: station.logo,
                        title: station.name ?? "Station",
                        subtitle: station.currentSong ?? station.currentShow,
                        aspectRatio: 1.0,
                        onSelect: {
                            audioManager.play(
                                contentId: station.id,
                                contentType: .radio
                            )
                        }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    func loadRadioStations() async {
        do {
            let response = try await repos.radio.fetchStations(cultureId: nil, genre: nil)
            await MainActor.run {
                radioStations = Array(response.stations.prefix(8))
            }
        } catch {
            // Radio is supplementary - fail silently
        }
    }

    func audiobooksSection(_ audiobookVM: AudiobooksViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            HStack {
                Text(localization.t("audiobooks.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    coordinator.fullscreenRoute = .audiobooks
                } label: {
                    Text(localization.t("common.seeAll"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(Array(audiobookVM.items.prefix(10))) { audiobook in
                        GlassFocusPoster(
                            thumbnailURL: audiobook.thumbnail,
                            title: audiobook.title ?? "Audiobook",
                            subtitle: audiobook.author,
                            badge: audiobook.duration,
                            aspectRatio: 2 / 3,
                            onSelect: {
                                coordinator.presentPlayer(
                                    contentId: audiobook.id,
                                    contentType: .audiobook
                                )
                            }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }
}
