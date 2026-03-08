#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Reusable podcast show card for grid layouts.
    /// Shows cover art, title, episode count, and latest episode date.
    struct TVPodcastShowCardView: View {
        @Environment(LocalizationManager.self) private var localization

        let show: PodcastShow
        let onSelect: () -> Void
        let onShowDetail: () -> Void

        var body: some View {
            Button(action: onSelect) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    coverArt
                    showMetadata
                }
            }
            .tvCardStyle()
            .contextMenu {
                Button {
                    onShowDetail()
                } label: {
                    Label(localization.t("podcasts.episodes"), systemImage: "list.bullet")
                }
                if show.isUserAdded == true {
                    Button(role: .destructive) {
                        // Removal handled by parent
                    } label: {
                        Label(localization.t("podcasts.removePodcast"), systemImage: "trash")
                    }
                }
            }
        }

        private var coverArt: some View {
            Group {
                if let urlStr = show.cover, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            ZStack {
                                DesignTokens.Background.primary
                                img.resizable().aspectRatio(contentMode: .fit)
                            }
                        } else {
                            coverPlaceholder
                        }
                    }
                } else {
                    coverPlaceholder
                }
            }
            .aspectRatio(1.0, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private var showMetadata: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(show.title ?? localization.t("podcasts.title"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)

                Text(show.author ?? " ")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if let count = show.episodeCount {
                        Text("\(count) \(localization.t("podcasts.episodes"))")
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    if let date = show.latestEpisode {
                        Text(date)
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
            }
            .frame(height: 100, alignment: .top)
        }

        private var coverPlaceholder: some View {
            ZStack {
                LinearGradient(
                    colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Image(systemName: "headphones")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted.opacity(0.5))
            }
        }
    }
#endif
