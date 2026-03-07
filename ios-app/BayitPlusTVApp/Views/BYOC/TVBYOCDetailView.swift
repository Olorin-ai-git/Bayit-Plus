#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS detail view for BYOC content, matching TVMovieDetailView layout.
    struct TVBYOCDetailView: View {
        let item: BYOCContentItem

        @Environment(BYOCSourceManager.self) var byocManager
        @Environment(LocalizationManager.self) var localization
        @State var enrichmentResult: BYOCEnrichmentResult?
        @State var isEnriching = false

        var body: some View {
            ScrollView(.vertical) {
                HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxl) {
                    posterColumn
                    infoColumn
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
            .background(DesignTokens.Background.primary.ignoresSafeArea())
            .task { await loadEnrichment() }
        }

        // MARK: - Columns

        private var posterColumn: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Group {
                    if let url = item.thumbnailURL {
                        CachedAsyncImage(url: url) { phase in
                            switch phase {
                            case let .success(img): img.resizable().aspectRatio(contentMode: .fill)
                            default: DesignTokens.Glass.bgMedium
                            }
                        }
                    } else {
                        DesignTokens.Glass.bgMedium
                    }
                }
                .aspectRatio(2 / 3, contentMode: .fit)
                .frame(width: 300)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))

                if let langs = enrichmentResult?.availableSubtitleLanguages, !langs.isEmpty {
                    SubtitleFlagsPill(languages: langs, aiLanguages: Set(langs), size: .medium)
                }
            }
        }

        private var infoColumn: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                titleSection
                metaSection
                actionButtons
                if isEnriching { enrichingIndicator }
                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineSpacing(6)
                }
            }
        }

        private var titleSection: some View {
            Text(item.title)
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }

        private var metaSection: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                if let year = item.year {
                    metaTag(String(year))
                }
                if let secs = item.duration {
                    let h = secs / 3600, m = (secs % 3600) / 60
                    metaTag(h > 0 ? "\(h)h \(m)m" : "\(m)m")
                }
                if let genre = item.genre { metaTag(genre) }
                sourceTag
            }
        }

        private func metaTag(_ text: String) -> some View {
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }

        private var sourceTag: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: sourceIcon)
                Text(localization.t("byoc.\(item.sourceType.rawValue)"))
            }
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            .foregroundStyle(sourceColor)
        }

        private var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let url = item.streamURL {
                    Button(localization.t("content.play")) {
                        UIApplication.shared.open(url)
                    }
                    .tvCardStyle()
                }
            }
        }

        private var enrichingIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ProgressView().tint(.white)
                Text(localization.t("byoc.findingSubtitles"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        private var sourceIcon: String {
            switch item.sourceType {
            case .plex: return "server.rack"
            case .youtube: return "play.rectangle.fill"
            case .iptv: return "antenna.radiowaves.left.and.right"
            }
        }

        private var sourceColor: Color {
            switch item.sourceType {
            case .plex: return .orange
            case .youtube: return .red
            case .iptv: return DesignTokens.Primary.p400
            }
        }

        private func loadEnrichment() async {
            enrichmentResult = byocManager.enrichmentResult(for: item)
            if enrichmentResult == nil {
                isEnriching = true
                await byocManager.enrichIfNeeded(item)
                enrichmentResult = byocManager.enrichmentResult(for: item)
                isEnriching = false
            }
        }
    }

#endif
