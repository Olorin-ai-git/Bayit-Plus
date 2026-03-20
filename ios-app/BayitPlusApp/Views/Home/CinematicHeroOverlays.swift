import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Overlay Router

struct CinematicHeroOverlay: View {
    let card: CinematicHeroCard
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        switch card.type {
        case .liveAIShowcase, .liveChannel:
            CinematicLiveTVOverlay()
        case .byocShowcase:
            CinematicBYOCOverlay()
        case .movieAIShowcase:
            CinematicMovieAIOverlay()
        case .continueWatching:
            CinematicContinueWatchingOverlay(
                progress: card.resumePosition.map { min($0 / 3600, 1.0) } ?? 0
            )
        case .podcast:
            CinematicPodcastOverlay(
                episodeCount: card.podcastEpisodeCount ?? 0
            )
        case .trending:
            CinematicTrendingOverlay(
                articleCount: card.trendingArticleCount ?? 0
            )
        }
    }
}

// MARK: - Live TV Overlay

struct CinematicLiveTVOverlay: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            liveBadge
            overlayPill(
                icon: "waveform",
                text: localization.t("cinematic.overlay.aiDubbed")
            )
            overlayPill(
                icon: "captions.bubble",
                text: localization.t("cinematic.overlay.liveSubtitles")
            )
        }
    }

    private var liveBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color.red)
                .frame(width: 6, height: 6)
            Text("LIVE")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, 4)
        .background(Color.red.opacity(0.8))
        .clipShape(Capsule())
    }
}

// MARK: - BYOC Overlay

struct CinematicBYOCOverlay: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var sparkleOpacity: Double = 0.6

    var body: some View {
        overlayPill(
            icon: "sparkles",
            text: localization.t("cinematic.overlay.pauseAskReady")
        )
        .opacity(sparkleOpacity)
        .task {
            while !Task.isCancelled {
                withAnimation(.easeInOut(duration: 1.0)) {
                    sparkleOpacity = sparkleOpacity == 0.6 ? 1.0 : 0.6
                }
                try? await Task.sleep(for: .seconds(1.0))
            }
        }
    }
}

// MARK: - Movie AI Overlay

struct CinematicMovieAIOverlay: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            overlayPill(
                icon: "text.bubble",
                text: localization.t("cinematic.movieAI.feature.pauseAsk")
            )
            overlayPill(
                icon: "person.wave.2",
                text: localization.t("cinematic.movieAI.feature.interactive")
            )
        }
    }
}

// MARK: - Continue Watching Overlay

struct CinematicContinueWatchingOverlay: View {
    let progress: Double
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            progressBar
            overlayPill(
                icon: "sparkles",
                text: localization.t("cinematic.overlay.aiEnhanced")
            )
        }
    }

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.2))
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(
                        width: geometry.size.width
                            * CGFloat(min(max(progress, 0), 1))
                    )
            }
        }
        .frame(width: 120, height: 4)
    }
}

// MARK: - Podcast Overlay

struct CinematicPodcastOverlay: View {
    let episodeCount: Int
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        overlayPill(
            icon: "headphones",
            text: localization.t(
                "cinematic.podcast.episodes",
                ["count": String(episodeCount)]
            )
        )
    }
}

// MARK: - Trending Overlay

struct CinematicTrendingOverlay: View {
    let articleCount: Int
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        overlayPill(
            icon: "flame",
            text: localization.t(
                "cinematic.trending.articles",
                ["count": String(articleCount)]
            )
        )
    }
}

// MARK: - Shared Pill Component

private func overlayPill(icon: String, text: String) -> some View {
    HStack(spacing: 4) {
        Image(systemName: icon)
            .font(.system(size: DesignTokens.FontSize.xs))
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
    }
    .foregroundStyle(.white)
    .padding(.horizontal, DesignTokens.Spacing.sm)
    .padding(.vertical, 4)
    .background(DesignTokens.Primary.p900.opacity(0.4))
    .clipShape(Capsule())
}
