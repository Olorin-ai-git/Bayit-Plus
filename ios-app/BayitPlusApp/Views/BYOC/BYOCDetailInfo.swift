import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Info Sections for BYOCDetailView

extension BYOCDetailView {
    var backdropSection: some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage
                .frame(height: 280, alignment: .top)
                .clipped()

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(item.title)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    if let year = item.year {
                        metadataTag(String(year))
                    }
                    if let duration = item.duration {
                        metadataTag(formattedDuration(duration))
                    }
                    if let genre = item.genre {
                        metadataTag(genre)
                    }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    @ViewBuilder
    private var backdropImage: some View {
        if let url = item.backdropURL ?? item.thumbnailURL {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case let .success(img): img.resizable().aspectRatio(contentMode: .fill)
                default: DesignTokens.Glass.bgMedium
                }
            }
            .frame(maxWidth: .infinity)
        } else {
            DesignTokens.Glass.bgMedium.frame(maxWidth: .infinity)
        }
    }

    private func metadataTag(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundColor(DesignTokens.Text.secondary)
    }

    var metadataSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            if let result = enrichmentResult,
               !result.availableSubtitleLanguages.isEmpty
            {
                SubtitleFlagsPill(
                    languages: result.availableSubtitleLanguages,
                    aiLanguages: Set(result.availableSubtitleLanguages),
                    size: .medium
                )
            }

            if let description = item.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }

            sourceBadgeRow
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var sourceBadgeRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: sourceIconName)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(sourceColor)
            Text(sourceDisplayName)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundColor(DesignTokens.Text.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(DesignTokens.Glass.bg)
        .clipShape(Capsule())
    }

    func genreChips(_ genre: String) -> some View {
        let genres = genre.split(separator: ",").map {
            $0.trimmingCharacters(in: .whitespaces)
        }
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

    var enrichmentProgressView: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Text(localization.t("byoc.findingSubtitles"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    var relatedSection: some View {
        let related = relatedItems
        if !related.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                Text(localization.t("content.relatedContent"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: DesignTokens.Spacing.md) {
                        ForEach(related) { relatedItem in
                            BYOCMovieCard(
                                item: relatedItem,
                                enrichmentResult: byocManager.enrichmentQueue?.result(for: relatedItem),
                                watchProgress: nil,
                                onTap: {}
                            )
                            .frame(width: 120)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                }
            }
        }
    }

    // MARK: - Helpers

    private var relatedItems: [BYOCContentItem] {
        let all: [BYOCContentItem] = switch item.sourceType {
        case .plex: byocManager.plexItems
        case .youtube: byocManager.youtubeItems
        case .iptv: []
        }
        return all.filter { $0.sourceId == item.sourceId && $0.id != item.id }
    }

    private var sourceIconName: String {
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
        case .iptv: return .blue
        }
    }

    private var sourceDisplayName: String {
        switch item.sourceType {
        case .plex: return localization.t("byoc.plex")
        case .youtube: return localization.t("byoc.youtube")
        case .iptv: return localization.t("byoc.iptv")
        }
    }

    func formattedDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }
}
