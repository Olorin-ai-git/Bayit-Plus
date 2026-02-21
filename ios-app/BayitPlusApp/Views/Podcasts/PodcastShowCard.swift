import BayitDesignSystem
import SwiftUI

/// Podcast show card with cover art, metadata, and inline play button
struct PodcastShowCard: View {
    @Environment(AudioPlaybackManager.self) private var audioManager

    let show: PodcastShow
    let onTap: () -> Void
    let onDelete: (() async -> Void)?

    private var isCurrentlyPlaying: Bool {
        audioManager.activeContentId == show.id && audioManager.isActive
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                ZStack(alignment: .bottomTrailing) {
                    coverImage
                        .aspectRatio(1, contentMode: .fill)
                        .clipped()

                    playButton
                        .padding(DesignTokens.Spacing.sm)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(show.title ?? "Podcast")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let author = show.author {
                        Text(author)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }

                    if let lastUpdated = show.latestEpisode {
                        Text(lastUpdated)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Primary.p400)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.bottom, DesignTokens.Spacing.sm)
            }
            .glassCard()
        }
        .buttonStyle(.plain)
        .contextMenu {
            if show.isUserAdded == true {
                Button(role: .destructive) {
                    Task { await onDelete?() }
                } label: {
                    Label("Remove Podcast", systemImage: "trash")
                }
            }
        }
    }

    private var playButton: some View {
        Button {
            if isCurrentlyPlaying {
                audioManager.togglePlayPause()
            } else {
                audioManager.play(contentId: show.id, contentType: .podcast)
            }
        } label: {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Circle()
                            .stroke(DesignTokens.Primary.default.opacity(0.3), lineWidth: 1)
                    )
                    .shadow(color: DesignTokens.Primary.default.opacity(0.3), radius: 8, x: 0, y: 2)

                Image(systemName: isCurrentlyPlaying && audioManager.isPlaying
                    ? "pause.fill"
                    : "play.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(DesignTokens.Primary.default)
            }
        }
        .accessibilityLabel(isCurrentlyPlaying ? "Pause \(show.title ?? "podcast")" : "Play \(show.title ?? "podcast")")
    }

    private var coverImage: some View {
        Group {
            if let urlStr = show.cover, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) {
                    coverPlaceholder
                }
            } else {
                coverPlaceholder
            }
        }
    }

    private var coverPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "headphones")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}
