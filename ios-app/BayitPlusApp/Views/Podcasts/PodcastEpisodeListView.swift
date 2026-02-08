import BayitDesignSystem
import SwiftUI
import UIKit

/// Episode list section for podcast detail with infinite scroll and play buttons
struct PodcastEpisodeListView: View {
    @Environment(NavigationCoordinator.self) private var coordinator

    let episodes: [PodcastEpisodeItem]
    let isLoadingMore: Bool
    let onLoadMore: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Episodes")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .accessibilityAddTraits(.isHeader)

            if episodes.isEmpty {
                Text("No episodes available")
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

    private func episodeRow(_ episode: PodcastEpisodeItem) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    if let number = episode.episodeNumber {
                        Text("Ep. \(number)")
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
