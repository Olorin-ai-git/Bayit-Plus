import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - SeriesDetailView Header Sections (Backdrop, Metadata, Favorite)

extension SeriesDetailView {
    func backdropSection(_ detail: SeriesDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage(detail)
                .frame(height: 260)
                .clipped()

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(detail.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    if let year = detail.year {
                        Text(String(year))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    if let seasons = detail.totalSeasons {
                        Text("\(seasons) \(localization.t("player.seasons"))")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    if let episodes = detail.totalEpisodes {
                        Text("\(episodes) \(localization.t("player.episodes"))")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    func backdropImage(_ detail: SeriesDetail) -> some View {
        Group {
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr)
            {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
        .frame(maxWidth: .infinity)
    }

    func metadataSection(_ detail: SeriesDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if let languages = detail.availableSubtitleLanguages, !languages.isEmpty {
                    SubtitleFlagsPill(
                        languages: languages,
                        aiLanguages: aiLanguages(for: languages),
                        size: .medium
                    )
                }

                if let rating = detail.ageRating ?? detail.rating, !rating.isEmpty {
                    Text(rating)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.black.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }
            }

            if let genre = detail.genre, !genre.isEmpty {
                genreChips(genre)
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func genreChips(_ genre: String) -> some View {
        let genres = genre.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(genres, id: \.self) { g in
                    Text(g)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.xs)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Capsule())
                }
            }
        }
    }

    func aiLanguages(for languages: [String]) -> Set<String> {
        var aiLangs = Set<String>()
        if languages.contains("he") { aiLangs.insert("he") }
        if languages.contains("en") { aiLangs.insert("en") }
        return aiLangs
    }

    func favoriteButton(_ vm: SeriesDetailViewModel) -> some View {
        Button {
            Task { await vm.toggleFavorite() }
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: vm.isFavorite ? "heart.fill" : "heart")
                    .font(.system(size: 18))
                    .foregroundColor(
                        vm.isFavorite ? DesignTokens.Primary.default : DesignTokens.Text.secondary
                    )

                Text(localization.t(vm.isFavorite ? "favorites.remove" : "favorites.add"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(vm.isFavoriteLoading)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
