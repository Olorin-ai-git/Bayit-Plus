import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Info Sections for MovieDetailView

extension MovieDetailView {
    func backdropSection(_ detail: ContentDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage(detail)
                .frame(height: 280, alignment: .top)
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
                    if let year = detail.year { metadataTag(String(year)) }
                    if let duration = detail.duration { metadataTag(duration) }
                    if let rating = detail.rating { metadataTag(rating.value) }
                    if let genre = detail.genre { metadataTag(genre) }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    func backdropImage(_ detail: ContentDetail) -> some View {
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

    func metadataTag(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundColor(DesignTokens.Text.secondary)
    }

    func metadataSection(_ detail: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            if let languages = detail.availableSubtitleLanguages, !languages.isEmpty {
                SubtitleFlagsPill(
                    languages: languages,
                    aiLanguages: aiLanguages(for: languages),
                    size: .medium
                )
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }

            if let director = detail.director {
                HStack {
                    Text(localization.t("content.director") + ":")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(director)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.primary)
                }
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
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("content.cast"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text(cast.joined(separator: ", "))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("content.relatedContent"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            width: 120,
                            placeholderIcon: .movie,
                            onTap: {
                                coordinator.navigate(to: .movieDetail(movieId: item.id))
                            }
                        )
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    func relatedSubtitle(_ item: RelatedItem) -> String? {
        let parts = [item.year.map(String.init), item.duration].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    func aiLanguages(for languages: [String]) -> Set<String> {
        var aiLangs = Set<String>()
        if languages.contains("he") { aiLangs.insert("he") }
        if languages.contains("en") { aiLangs.insert("en") }
        return aiLangs
    }
}
