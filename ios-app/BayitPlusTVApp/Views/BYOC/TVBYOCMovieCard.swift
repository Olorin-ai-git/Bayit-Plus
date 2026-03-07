#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS BYOC content card matching native card design with enrichment overlays.
    struct TVBYOCMovieCard: View {
        let item: BYOCContentItem
        let enrichmentResult: BYOCEnrichmentResult?
        let watchProgress: Double?
        let onTap: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 0) {
                    posterImage
                        .aspectRatio(2 / 3, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                        .overlay(alignment: .bottomTrailing) { subtitlePill }
                        .overlay(alignment: .topTrailing) { sourceBadge }

                    if let progress = watchProgress, progress > 0 {
                        progressBar(progress)
                    }

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(item.title)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(2)

                        if let sub = subtitleText {
                            Text(sub)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundColor(DesignTokens.Text.muted)
                                .lineLimit(1)
                        }
                    }
                    .padding(.top, TVDesignTokens.Spacing.xs)
                }
            }
            .tvCardStyle()
            .buttonStyle(.plain)
        }

        @ViewBuilder
        private var posterImage: some View {
            if let url = item.thumbnailURL {
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
                Image(systemName: "film")
                    .font(.system(size: 36))
                    .foregroundColor(DesignTokens.Text.muted)
            }
        }

        @ViewBuilder
        private var subtitlePill: some View {
            if let langs = enrichmentResult?.availableSubtitleLanguages, !langs.isEmpty {
                SubtitleFlagsPill(languages: langs, aiLanguages: Set(langs), size: .small)
                    .padding(TVDesignTokens.Spacing.xs)
            }
        }

        private var sourceBadge: some View {
            Image(systemName: sourceIcon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(sourceColor)
                .padding(6)
                .background(Color.black.opacity(0.7))
                .clipShape(Circle())
                .padding(TVDesignTokens.Spacing.xs)
        }

        private func progressBar(_ progress: Double) -> some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(DesignTokens.Glass.bgMedium).frame(height: 4)
                    Rectangle()
                        .fill(DesignTokens.Primary.p600)
                        .frame(width: geo.size.width * CGFloat(progress / 100), height: 4)
                }
            }
            .frame(height: 4)
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

        private var subtitleText: String? {
            var parts: [String] = []
            if let year = item.year { parts.append(String(year)) }
            if let secs = item.duration {
                let h = secs / 3600, m = (secs % 3600) / 60
                parts.append(h > 0 ? "\(h)h \(m)m" : "\(m)m")
            }
            return parts.isEmpty ? nil : parts.joined(separator: " | ")
        }
    }

#endif
