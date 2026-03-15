import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Episode list section for podcast detail with infinite scroll and play buttons
struct PodcastEpisodeListView: View {
    @Environment(AudioPlaybackManager.self) private var audioManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(DownloadManager.self) private var downloadManager

    let episodes: [PodcastEpisodeItem]
    let showTitle: String?
    let showCover: String?
    let isLoadingMore: Bool
    let isRefreshing: Bool
    let onLoadMore: () async -> Void
    let onRefresh: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            episodesHeader

            if episodes.isEmpty {
                Text(localization.t("podcasts.noEpisodes"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, DesignTokens.Spacing.xl)
            } else {
                ForEach(episodes) { episode in
                    episodeRow(episode)
                        .onAppear {
                            if episode.id == episodes.last?.id {
                                Task { await onLoadMore() }
                            }
                        }
                }

                if isLoadingMore {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                }
            }
        }
    }

    private var episodesHeader: some View {
        HStack {
            Text(localization.t("podcasts.episodes"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .accessibilityAddTraits(.isHeader)

            Spacer()

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                Task { await onRefresh() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .rotationEffect(.degrees(isRefreshing ? 360 : 0))
                    .animation(
                        isRefreshing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default,
                        value: isRefreshing
                    )
            }
            .disabled(isRefreshing)
            .accessibilityLabel(localization.t("podcasts.refreshEpisodes"))
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func episodeRow(_ episode: PodcastEpisodeItem) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    if let number = episode.episodeNumber {
                        Text(localization.t("podcasts.episodeShort", ["number": String(number)]))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Primary.p400)
                    }

                    Text(episode.title ?? "Episode")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let duration = episode.duration {
                        Text(duration)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                if episode.audioUrl != nil {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        podcastEpisodeDownloadButton(episode)
                        Button {
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                            playEpisode(episode)
                        } label: {
                            Image(systemName: episodePlayIcon(for: episode))
                                .font(.system(size: 32))
                                .foregroundColor(DesignTokens.Primary.default)
                        }
                        .accessibilityLabel(isEpisodePlaying(episode) ? "Pause \(episode.title ?? "episode")" : "Play \(episode.title ?? "episode")")
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Inline Playback

    private func isEpisodePlaying(_ episode: PodcastEpisodeItem) -> Bool {
        audioManager.activeContentId == episode.id && audioManager.isActive
    }

    private func episodePlayIcon(for episode: PodcastEpisodeItem) -> String {
        isEpisodePlaying(episode) && audioManager.isPlaying
            ? "pause.circle.fill"
            : "play.circle.fill"
    }

    private func podcastEpisodeDownloadButton(_ episode: PodcastEpisodeItem) -> some View {
        let dlStatus = downloadManager.downloads.first(where: { $0.contentId == episode.id })?.status
        let isDownloaded = dlStatus == .completed
        let isActive = dlStatus == .downloading || dlStatus == .queued || dlStatus == .paused
        return Button {
            guard !isDownloaded, !isActive else { return }
            Task {
                await downloadManager.startDownload(DownloadRequest(
                    contentId: episode.id,
                    title: episode.title ?? "Episode",
                    thumbnail: showCover,
                    contentType: .podcast,
                    streamUrl: episode.audioUrl
                ))
            }
        } label: {
            Image(systemName: isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle")
                .font(.system(size: 22))
                .foregroundColor(isDownloaded ? .green : (isActive ? DesignTokens.Primary.default : DesignTokens.Text.muted))
        }
        .buttonStyle(.plain)
        .disabled(isActive || isDownloaded)
    }

    private func playEpisode(_ episode: PodcastEpisodeItem) {
        if isEpisodePlaying(episode) {
            audioManager.togglePlayPause()
            return
        }

        if let urlStr = episode.audioUrl, let url = URL(string: urlStr) {
            let coverURL: URL? = showCover.flatMap { URL(string: $0) }
            audioManager.playDirectURL(
                url: url,
                title: episode.title ?? "Episode",
                subtitle: showTitle,
                artworkURL: coverURL,
                contentId: episode.id,
                contentType: .podcast
            )
        } else {
            audioManager.play(contentId: episode.id, contentType: .podcast)
        }
    }
}
