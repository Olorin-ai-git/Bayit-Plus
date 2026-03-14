import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Individual VOD content card with poster, title, and metadata
struct VODCard: View {
    let item: ContentItem
    var isDownloaded: Bool = false
    let onTap: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    )
                    .overlay(alignment: .bottomTrailing) {
                        subtitlePill
                    }
                    .overlay(alignment: .bottomLeading) {
                        if item.isCollectionParent == true {
                            collectionBadge
                        } else {
                            seriesBadge
                        }
                    }
                    .overlay(alignment: .topLeading) {
                        contentRatingBadge
                    }
                    .overlay(alignment: .topTrailing) {
                        if isDownloaded { downloadedBadge } else { hebrewDubBadge }
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title ?? "Untitled")
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(.top, DesignTokens.Spacing.xs)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case let .success(img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    posterPlaceholder
                }
            }
        } else {
            posterPlaceholder
        }
    }

    private var posterPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: item.type?.lowercased() == "series" ? "tv" : "film")
                .font(.system(size: 28))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    @ViewBuilder
    private var subtitlePill: some View {
        if let langs = item.availableSubtitleLanguages, !langs.isEmpty {
            SubtitleFlagsPill(
                languages: langs,
                aiLanguages: aiLanguages,
                size: .small
            )
            .padding(DesignTokens.Spacing.xs)
        }
    }

    @ViewBuilder
    private var seriesBadge: some View {
        if item.type?.lowercased() == "series" {
            Text(localization.t("vod.series"))
                .font(.system(
                    size: DesignTokens.FontSize.xs,
                    weight: .semibold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, 3)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    private var collectionBadge: some View {
        let movies = localization.t("vod.collection.movies")
        let of = localization.t("vod.collection.of")
        let badgeText: String
        if let available = item.availableMovies, let total = item.totalMovies, total > available {
            badgeText = "\(available) \(of) \(total) \(movies)"
        } else if let available = item.availableMovies {
            badgeText = "\(available) \(movies)"
        } else {
            badgeText = localization.t("home.collection")
        }

        return Text(badgeText)
            .font(.system(
                size: DesignTokens.FontSize.xs,
                weight: .semibold
            ))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
            .padding(DesignTokens.Spacing.xs)
    }

    @ViewBuilder
    private var contentRatingBadge: some View {
        if let rating = item.contentRating, !rating.isEmpty {
            Text(rating)
                .font(.system(
                    size: DesignTokens.FontSize.xs - 1,
                    weight: .bold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(Color.black.opacity(0.7))
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    @ViewBuilder
    private var hebrewDubBadge: some View {
        if item.hasHebrewDub {
            Text(localization.t("vod.hebrewDub"))
                .font(.system(
                    size: DesignTokens.FontSize.xs - 1,
                    weight: .semibold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(DesignTokens.Primary.default.opacity(0.85))
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    private var downloadedBadge: some View {
        Image(systemName: "arrow.down.circle.fill")
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(.green)
            .padding(4)
            .background(Color.black.opacity(0.7))
            .clipShape(Circle())
            .padding(DesignTokens.Spacing.xs)
    }
}
