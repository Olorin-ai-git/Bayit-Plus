#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Horizontal scrolling row of podcast show cards for discovery.
    /// Includes a "Browse All" button linking to full podcast grid.
    struct TVPodcastsDiscoveryRow: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVAudioPlaybackManager.self) private var audioManager
        @Environment(LocalizationManager.self) private var localization

        let shows: [PodcastShow]
        let onAddPodcast: () -> Void

        var body: some View {
            if shows.isEmpty {
                EmptyView()
            } else {
                sectionContent
            }
        }

        private var sectionContent: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                sectionHeader
                podcastsScrollRow
            }
        }

        private var sectionHeader: some View {
            HStack {
                Text(localization.t("listen.discoverPodcasts"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    onAddPodcast()
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        Text(localization.t("podcasts.addPodcast"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .tvCardStyle()

                Button {
                    coordinator.fullscreenRoute = .podcastBrowse
                } label: {
                    Text(localization.t("listen.browseAll"))
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
        }

        private var podcastsScrollRow: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(shows.prefix(12)) { show in
                        GlassFocusPoster(
                            thumbnailURL: show.cover,
                            title: show.title ?? localization.t("podcasts.title"),
                            subtitle: show.author,
                            metadata: show.latestEpisode,
                            aspectRatio: 1.0,
                            onSelect: {
                                audioManager.play(
                                    contentId: show.id,
                                    contentType: .podcast
                                )
                            }
                        )
                        .contextMenu {
                            Button {
                                coordinator.fullscreenRoute = .podcastDetail(showId: show.id)
                            } label: {
                                Label(localization.t("podcasts.episodes"), systemImage: "list.bullet")
                            }
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }
#endif
