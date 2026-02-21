#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Vertical list of episodes within a series season, each with play button.
    struct TVSeriesEpisodeListView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        let episodes: [EpisodeItem]
        let seriesId: String
        let seriesRating: String?
        private let logger = BayitLogger(category: "TVSeriesEpisodeList")

        private var sorted: [EpisodeItem] {
            episodes.sorted { ($0.episodeNumber ?? 0) < ($1.episodeNumber ?? 0) }
        }

        var body: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("content.episodes"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)

                VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(sorted) { episode in
                        episodeRow(episode)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }

        private func episodeRow(_ episode: EpisodeItem) -> some View {
            Button {
                logger.info("Playing series episode", context: [
                    "seriesId": seriesId,
                    "episodeId": episode.id,
                ])
                coordinator.presentPlayer(contentId: episode.id, contentType: .vod)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text("#\(episode.episodeNumber ?? 0)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 60)

                    episodeThumbnail(episode.thumbnail)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(episodeLabel(episode))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)

                        Text(episode.title ?? localization.t("content.episodes"))
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            if let duration = episode.duration {
                                Text(duration)
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                            if let rating = seriesRating {
                                HStack(spacing: TVDesignTokens.Spacing.xxs) {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: TVDesignTokens.FontSize.sm))
                                    Text(rating)
                                        .font(.system(size: TVDesignTokens.FontSize.md))
                                }
                                .foregroundStyle(DesignTokens.Warning.default)
                            }
                        }
                    }

                    Spacer()

                    Image(systemName: "play.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }

        private func episodeLabel(_ episode: EpisodeItem) -> String {
            if let num = episode.episodeNumber {
                return "\(localization.t("content.episode")) \(num)"
            }
            return localization.t("content.episode")
        }

        private func episodeThumbnail(_ urlStr: String?) -> some View {
            Group {
                if let urlStr = urlStr, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            thumbnailPlaceholder
                        }
                    }
                } else {
                    thumbnailPlaceholder
                }
            }
            .frame(width: 240, height: 135)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
        }

        private var thumbnailPlaceholder: some View {
            Rectangle().fill(DesignTokens.Glass.bgStrong)
                .overlay(
                    Image(systemName: "film")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Text.muted)
                )
        }
    }
#endif
