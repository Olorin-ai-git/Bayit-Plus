#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Actions & Description

    extension TVCollectionDetailView {
        func actionButtons(_ collection: CollectionDetail) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                if let movies = collection.movies, !movies.isEmpty {
                    GlassButton(
                        localization.t("vod.collection.playAll"),
                        variant: .primary,
                        size: .large,
                        action: {
                            logger.info("Playing all collection movies", context: [
                                "collectionId": collectionId,
                                "movieCount": String(movies.count),
                            ])
                            let sorted = movies.sorted { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) }
                            guard let first = sorted.first else { return }
                            coordinator.presentPlayer(contentId: first.id, contentType: .vod)
                            let ids = sorted.map { $0.id }
                            Task { try? await repos.playlist.addBulkToPlaylist(contentIds: ids) }
                        }
                    )
                    .frame(width: 400)
                    .tvCardStyle()
                }

                if resolvedTrailerUrl != nil {
                    GlassButton(
                        localization.t("content.trailer"),
                        variant: .secondary,
                        size: .large,
                        action: { showTrailer = true }
                    )
                    .frame(width: 300)
                    .tvCardStyle()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        func descriptionSection(_ collection: CollectionDetail) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                if let description = collection.localizedDescription(for: lang) {
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(8)
                        .lineSpacing(TVDesignTokens.Spacing.xs)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .frame(maxWidth: 1200, alignment: .leading)
        }

        func promoCard(_ text: String) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(DesignTokens.Primary.default)
                    Text(localization.t("vod.collection.aiRecommendation"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .textCase(.uppercase)
                }

                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineSpacing(6)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .focusable(false)
        }
    }
#endif
