#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Vertical list of movies within a collection, each with play button.
    struct TVCollectionMovieListView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        let movies: [CollectionMovie]
        let collectionId: String
        private let logger = BayitLogger(category: "TVCollectionMovieList")

        private var sorted: [CollectionMovie] {
            movies.sorted { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) }
        }

        private var lang: String {
            localization.currentLanguage.rawValue
        }

        var body: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("vod.collection.movies").capitalized)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)

                VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(sorted) { movie in
                        movieRow(movie)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }

        private func movieRow(_ movie: CollectionMovie) -> some View {
            Button {
                logger.info("Playing collection movie", context: [
                    "collectionId": collectionId,
                    "movieId": movie.id,
                ])
                coordinator.presentPlayer(contentId: movie.id, contentType: .vod)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text("#\(movie.collectionOrder ?? 0)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 60)

                    movieThumbnail(movie.thumbnail)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(movie.localizedTitle(for: lang) ?? localization.t("home.collection"))
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            if let year = movie.year {
                                Text(String(year))
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                            if let duration = movie.duration {
                                Text(duration)
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                            if let rating = movie.rating?.value {
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

        private func movieThumbnail(_ urlStr: String?) -> some View {
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

        func playAll() {
            guard let first = sorted.first else { return }
            coordinator.presentPlayer(contentId: first.id, contentType: .vod)
            let movieIds = sorted.map { $0.id }
            Task { try? await repos.playlist.addBulkToPlaylist(contentIds: movieIds) }
        }
    }
#endif
