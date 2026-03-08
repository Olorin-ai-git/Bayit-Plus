#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVBYOCDetailView Section Builders

    extension TVBYOCDetailView {
        // MARK: - Backdrop Hero (700pt, matches TVMovieDetailView)

        var backdropSection: some View {
            ZStack(alignment: .bottomLeading) {
                let imageUrl = item.backdropURL ?? item.thumbnailURL
                if let url = imageUrl {
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
                } else {
                    DesignTokens.Glass.bg
                }

                LinearGradient(
                    colors: [.clear, DesignTokens.Background.primary],
                    startPoint: .center,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(item.title)
                        .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        if let year = item.year {
                            Text(String(year))
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        if let secs = item.duration {
                            let h = secs / 3600, m = (secs % 3600) / 60
                            Text(h > 0 ? "\(h)h \(m)m" : "\(m)m")
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        if let genre = item.genre {
                            Text(genre)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        sourceTag
                    }

                    if let langs = enrichmentResult?.availableSubtitleLanguages, !langs.isEmpty {
                        SubtitleFlagsPill(languages: langs, aiLanguages: Set(langs), size: .medium)
                    }
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 700)
            .clipped()
            .ignoresSafeArea(edges: [.top, .horizontal])
        }

        // MARK: - Source Tag

        private var sourceTag: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: sourceIcon)
                Text(localization.t("byoc.\(item.sourceType.rawValue)"))
            }
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            .foregroundStyle(sourceColor)
        }

        private var sourceIcon: String {
            switch item.sourceType {
            case .plex: return "server.rack"
            case .youtube: return "play.rectangle.fill"
            case .iptv: return "antenna.radiowaves.left.and.right"
            case .xtream: return "tv.and.mediabox"
            }
        }

        private var sourceColor: Color {
            switch item.sourceType {
            case .plex: return .orange
            case .youtube: return .red
            case .iptv: return DesignTokens.Primary.p400
            case .xtream: return .purple
            }
        }

        // MARK: - Action Buttons

        var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                if item.streamURL != nil {
                    GlassButton(
                        localization.t("content.play"),
                        variant: .primary,
                        size: .large,
                        icon: Image(systemName: "play.fill"),
                        action: {
                            logger.info("Playing BYOC content", context: ["id": item.id])
                            showPlayer = true
                        }
                    )
                }

                if isEnriching {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        ProgressView().tint(.white)
                        Text(localization.t("byoc.findingSubtitles"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .focusSection()
        }

        // MARK: - Description

        var descriptionSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                if let genre = item.genre {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(genre.components(separatedBy: ", "), id: \.self) { tag in
                            GlassChip(title: tag, isSelected: false, onTap: {})
                        }
                    }
                }

                if let description = item.description {
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(8)
                        .lineSpacing(TVDesignTokens.Spacing.xs)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .frame(maxWidth: 1200, alignment: .leading)
            .focusSection()
        }
    }

#endif
