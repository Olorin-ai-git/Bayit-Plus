import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVMovieDetailView Detail Section Builders

extension TVMovieDetailView {
    func backdropSection(_ detail: ContentDetail) -> some View {
        let hasTrailerPlayer = trailerPlayer != nil

        return ZStack(alignment: .bottomLeading) {
            // Always keep the image in the tree; hide via opacity when trailer plays.
            // Avoids tvOS focus-system crash from structural view-tree swaps.
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr)
            {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        DesignTokens.Glass.bg
                    @unknown default:
                        DesignTokens.Glass.bg
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
                .opacity(hasTrailerPlayer ? 0 : 1)
            } else {
                DesignTokens.Glass.bg
                    .opacity(hasTrailerPlayer ? 0 : 1)
            }

            if let player = trailerPlayer {
                TVVideoPlayerRepresentable(player: player)
            }

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(detail.title ?? "Untitled")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let year = detail.year {
                        Text(String(year))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    if let duration = detail.duration {
                        Text(duration)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    if let rating = detail.rating?.value {
                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            Image(systemName: "star.fill")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                            Text(rating)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                        }
                        .foregroundStyle(DesignTokens.Warning.default)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 700)
        .clipped()
        .ignoresSafeArea(edges: [.top, .horizontal])
    }

    func actionButtons(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                "Play",
                variant: .primary,
                size: .large,
                action: {
                    logger.info("Playing movie", context: ["movieId": movieId])
                    coordinator.presentPlayer(
                        contentId: detail.id,
                        contentType: .vod
                    )
                }
            )
            .frame(width: 400)
            .buttonStyle(.card)
            .tvFocusStyle()

            if vm.hasTrailer {
                GlassButton(
                    localization.t("content.trailer"),
                    variant: .secondary,
                    size: .large,
                    action: {
                        logger.info("Opening trailer", context: ["movieId": movieId])
                        Task {
                            await resolveAndShowTrailer(contentId: detail.id)
                        }
                    }
                )
                .frame(width: 300)
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    func descriptionSection(_ detail: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            if let genre = detail.genre {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(genre.components(separatedBy: ", "), id: \.self) { tag in
                        GlassChip(title: tag, isSelected: false, onTap: {})
                    }
                }
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(8)
                    .lineSpacing(TVDesignTokens.Spacing.xs)
            }

            if let director = detail.director {
                Text("\(localization.t("content.director")): \(director)")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 1200, alignment: .leading)
    }

    func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("content.cast"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(cast, id: \.self) { member in
                        VStack(spacing: TVDesignTokens.Spacing.md) {
                            Circle()
                                .fill(DesignTokens.Glass.bg)
                                .frame(width: 180, height: 180)
                                .overlay(
                                    Text(String(member.prefix(1)))
                                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                                        .foregroundStyle(DesignTokens.Text.secondary)
                                )

                            Text(member)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                                .frame(width: 180)
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("content.related"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        GlassFocusPoster(
                            thumbnailURL: item.thumbnail,
                            title: item.title ?? "Untitled",
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            onSelect: {
                                logger.info("Selected related item", context: ["itemId": item.id])
                            }
                        )
                        .frame(width: 260)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    func relatedSubtitle(_ item: RelatedItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
