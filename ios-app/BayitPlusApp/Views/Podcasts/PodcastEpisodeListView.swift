import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Episode list section for podcast detail with infinite scroll and play buttons
struct PodcastEpisodeListView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let episodes: [PodcastEpisodeItem]
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
            .accessibilityLabel("Refresh latest episodes")
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
                    Button {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        coordinator.navigate(to: .player(
                            contentId: episode.id,
                            contentType: .podcast
                        ))
                    } label: {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                    .accessibilityLabel("Play \(episode.title ?? "episode")")
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .accessibilityElement(children: .combine)
    }
}
