import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVPodcastDetailView + Episode Row & Helpers

extension TVPodcastDetailView {
    func episodeRow(_ episode: PodcastEpisodeItem) -> some View {
        GlassCard {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let urlStr = episode.thumbnail, let url = URL(string: urlStr) {
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
                    .frame(width: 180, height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(episode.title ?? "Untitled Episode")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let description = episode.description {
                        Text(description.htmlStripped)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(3)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        if let duration = episode.duration {
                            Text(duration)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        if let publishedAt = episode.publishedAt {
                            Text(formatDate(publishedAt))
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(
                    episodeButtonLabel(for: episode),
                    variant: .secondary,
                    size: .medium,
                    action: {
                        logger.info("Playing podcast episode", context: [
                            "showId": showId,
                            "episodeId": episode.id,
                        ])
                        playEpisode(episode)
                    }
                )
                .frame(width: 200)
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .tvCardStyle()
    }

    func episodeButtonLabel(for episode: PodcastEpisodeItem) -> String {
        let isEpisodeActive = audioManager.activeContentId == episode.id && audioManager.isActive
        return isEpisodeActive && audioManager.isPlaying ? "Pause" : "Play"
    }

    func playEpisode(_ episode: PodcastEpisodeItem) {
        if let audioUrlStr = episode.audioUrl, let audioURL = URL(string: audioUrlStr) {
            audioManager.playDirectURL(
                url: audioURL,
                title: episode.title ?? "Episode",
                subtitle: viewModel?.detail?.author,
                artworkURL: (episode.thumbnail ?? viewModel?.detail?.cover).flatMap { URL(string: $0) },
                contentId: episode.id,
                contentType: .podcast
            )
        } else {
            audioManager.play(contentId: episode.id, contentType: .podcast)
        }
    }

    func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        return displayFormatter.string(from: date)
    }
}
