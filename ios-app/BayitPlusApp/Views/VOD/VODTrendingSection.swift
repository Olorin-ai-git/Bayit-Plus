import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - VODView Trending and AI Collections Sections

extension VODView {
    var trendingSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text(localization.t("vod.trending"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(trendingRecommendations) { item in
                        TrendingContentCard(item: item) {
                            coordinator.navigate(to: .movieDetail(movieId: item.id))
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    var aiCollectionsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundColor(DesignTokens.Primary.default)
                Text(localization.t("vod.aiCollections"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(aiCollectionRecommendations) { collection in
                        AICollectionCard(collection: collection) {
                            coordinator.navigate(to: .collectionDetail(collectionId: collection.id))
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
}

/// Card for trending content recommendations
struct TrendingContentCard: View {
    let item: TrendingContentRecommendation
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .topLeading) {
                        if let topic = item.trendingTopic {
                            Text(topic)
                                .font(.system(
                                    size: DesignTokens.FontSize.xs - 1,
                                    weight: .semibold
                                ))
                                .foregroundColor(.white)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.85))
                                .clipShape(
                                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                )
                                .padding(DesignTokens.Spacing.xs)
                        }
                    }

                Text(item.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .padding(.top, DesignTokens.Spacing.xs)
            }
            .frame(width: 120)
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
                    ZStack {
                        DesignTokens.Glass.bgMedium
                        Image(systemName: "film")
                            .font(.system(size: 24))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }
            }
        } else {
            ZStack {
                DesignTokens.Glass.bgMedium
                Image(systemName: "film")
                    .font(.system(size: 24))
                    .foregroundColor(DesignTokens.Text.muted)
            }
        }
    }
}

/// Card for AI-recommended collections
struct AICollectionCard: View {
    @Environment(LocalizationManager.self) private var localization
    let collection: CollectionDetail
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                posterImage
                    .frame(width: 160, height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .topLeading) {
                        HStack(spacing: 2) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 8))
                            Text(localization.t("vod.aiBadge"))
                                .font(.system(
                                    size: DesignTokens.FontSize.xs - 1,
                                    weight: .bold
                                ))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Primary.default.opacity(0.85))
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        )
                        .padding(DesignTokens.Spacing.xs)
                    }

                Text(collection.localizedTitle(
                    for: localization.currentLanguage.rawValue
                ) ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)

                if let movies = collection.availableMovies {
                    Text("\(movies) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }
            .frame(width: 160)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = collection.thumbnail ?? collection.backdrop,
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
}
