#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Horizontal scrolling row of live radio stations with NOW PLAYING indicator.
    /// Displays station logo, name, and current show/song.
    struct TVRadioStationsRow: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVAudioPlaybackManager.self) private var audioManager
        @Environment(LocalizationManager.self) private var localization

        let stations: [RadioStationItem]

        var body: some View {
            if stations.isEmpty {
                EmptyView()
            } else {
                sectionContent
            }
        }

        private var sectionContent: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("listen.radioStations"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.leading, TVDesignTokens.Spacing.xl)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(stations) { station in
                            radioStationCard(station)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }
            }
        }

        private func radioStationCard(_ station: RadioStationItem) -> some View {
            let isActive = audioManager.activeContentId == station.id && audioManager.isActive

            return Button {
                audioManager.play(contentId: station.id, contentType: .radio)
            } label: {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    ZStack(alignment: .bottomTrailing) {
                        stationLogo(station)
                            .frame(width: 120, height: 120)
                            .clipShape(Circle())

                        if isActive {
                            nowPlayingBadge
                        }
                    }

                    Text(station.name ?? localization.t("radio.title"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let info = station.currentSong ?? station.currentShow {
                        Text(info)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(TVDesignTokens.Spacing.lg)
                .frame(width: TVDesignTokens.MinSize.posterWidth)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .stroke(
                            isActive ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                            lineWidth: isActive ? TVDesignTokens.Focus.ringWidth : 1
                        )
                )
            }
            .tvCardStyle()
        }

        private func stationLogo(_ station: RadioStationItem) -> some View {
            Group {
                if let urlStr = station.logo, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            radioPlaceholder
                        }
                    }
                } else {
                    radioPlaceholder
                }
            }
        }

        private var radioPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.purpleLight
                Image(systemName: "radio")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        private var nowPlayingBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: "waveform")
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                    .symbolEffect(.variableColor.iterative, isActive: true)
                Text(localization.t("listen.nowPlaying"))
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
            }
            .foregroundStyle(DesignTokens.Primary.default)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(Capsule())
        }
    }
#endif
