import BayitBYOC
import BayitLocalization
import Foundation

enum CinematicHeroCardType: String {
    case liveAIShowcase
    case byocShowcase
    case movieAIShowcase
    case continueWatching
    case liveChannel
    case podcast
    case trending
}

enum CinematicHeroAction {
    case primary
    case secondary
}

struct CinematicHeroCard: Identifiable {
    let id: String
    let type: CinematicHeroCardType
    let title: String
    let subtitle: String
    let backgroundAsset: String?
    let backgroundURL: URL?
    let categoryLabel: String?
    let showAIBadge: Bool
    let videoURL: URL?
    let channelId: String?
    let contentItem: ContentItem?
    let resumePosition: TimeInterval?
    let podcastEpisodeCount: Int?
    let trendingArticleCount: Int?

    init(
        id: String,
        type: CinematicHeroCardType,
        title: String,
        subtitle: String,
        backgroundAsset: String? = nil,
        backgroundURL: URL? = nil,
        categoryLabel: String? = nil,
        showAIBadge: Bool = false,
        videoURL: URL? = nil,
        channelId: String? = nil,
        contentItem: ContentItem? = nil,
        resumePosition: TimeInterval? = nil,
        podcastEpisodeCount: Int? = nil,
        trendingArticleCount: Int? = nil
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.subtitle = subtitle
        self.backgroundAsset = backgroundAsset
        self.backgroundURL = backgroundURL
        self.categoryLabel = categoryLabel
        self.showAIBadge = showAIBadge
        self.videoURL = videoURL
        self.channelId = channelId
        self.contentItem = contentItem
        self.resumePosition = resumePosition
        self.podcastEpisodeCount = podcastEpisodeCount
        self.trendingArticleCount = trendingArticleCount
    }
}

// MARK: - Card Building

extension CinematicHeroCard {
    @MainActor
    static func buildHeroCards(
        from viewModel: HomeViewModel,
        byocManager: BYOCSourceManager,
        localization: LocalizationManager
    ) -> [CinematicHeroCard] {
        var cards: [CinematicHeroCard] = []

        let hasBYOC = !byocManager.plexItems.isEmpty
            || !byocManager.youtubeItems.isEmpty
        let hasHistory = !viewModel.continueWatching.isEmpty

        // 1. Live AI Showcase
        if let channel = viewModel.liveChannels.first {
            cards.append(liveAICard(channel, localization: localization))
        }

        // 2. BYOC Showcase (conditional)
        if hasBYOC {
            let item = byocManager.plexItems.first
                ?? byocManager.youtubeItems.first
            if let item {
                cards.append(byocCard(item, localization: localization))
            }
        }

        // 3. Movie AI Showcase
        cards.append(
            movieAICard(
                viewModel: viewModel,
                byocManager: byocManager,
                localization: localization
            )
        )

        // 4. Continue Watching (conditional)
        if hasHistory, let item = viewModel.continueWatching.first {
            cards.append(continueWatchingCard(item, localization: localization))
        }

        // 5. Podcast (conditional — first podcast from categories)
        if let podcastCard = podcastCard(
            from: viewModel, localization: localization
        ) {
            cards.append(podcastCard)
        }

        // 6. Trending (conditional)
        if let trendingCard = trendingCard(
            from: viewModel, localization: localization
        ) {
            cards.append(trendingCard)
        }

        // 7. Remaining live channels
        let showcaseId = viewModel.liveChannels.first?.id
        for channel in viewModel.liveChannels
            where channel.id != showcaseId
        {
            cards.append(liveChannelCard(channel, localization: localization))
        }

        return cards
    }
}

// MARK: - Individual Card Builders

@MainActor
private extension CinematicHeroCard {
    static func liveAICard(
        _ channel: LiveChannelItem,
        localization: LocalizationManager
    ) -> CinematicHeroCard {
        CinematicHeroCard(
            id: "live-ai-showcase",
            type: .liveAIShowcase,
            title: channel.name ?? localization.t("cinematic.liveTV.title"),
            subtitle: localization.t("cinematic.liveTV.subtitle"),
            backgroundURL: (channel.thumbnail ?? channel.logo)
                .flatMap { URL(string: $0) },
            categoryLabel: localization.t("cinematic.liveAI.groupLabel"),
            showAIBadge: true,
            channelId: channel.id
        )
    }

    static func byocCard(
        _ item: BYOCContentItem,
        localization: LocalizationManager
    ) -> CinematicHeroCard {
        CinematicHeroCard(
            id: "byoc-showcase",
            type: .byocShowcase,
            title: item.title ?? localization.t("cinematic.byoc.title"),
            subtitle: localization.t("cinematic.byoc.subtitle"),
            backgroundURL: item.thumbnailURL,
            showAIBadge: true,
            videoURL: item.streamURL
        )
    }

    static func movieAICard(
        viewModel: HomeViewModel,
        byocManager: BYOCSourceManager,
        localization: LocalizationManager
    ) -> CinematicHeroCard {
        let byocItem = byocManager.plexItems.first
            ?? byocManager.youtubeItems.first
        let spotlightItem = viewModel.spotlight.first
        let spotlightBackdrop: URL? = spotlightItem
            .flatMap { $0.backdrop ?? $0.thumbnail }
            .flatMap { URL(string: $0) }
        let backgroundURL = byocItem?.thumbnailURL ?? spotlightBackdrop
        let bgVideoURL = byocItem?.streamURL

        return CinematicHeroCard(
            id: "movie-ai-showcase",
            type: .movieAIShowcase,
            title: localization.t("cinematic.pauseAsk.title"),
            subtitle: localization.t("cinematic.pauseAsk.subtitle"),
            backgroundAsset: backgroundURL == nil ? "Masada" : nil,
            backgroundURL: backgroundURL,
            categoryLabel: localization.t("cinematic.movieAI.groupLabel"),
            showAIBadge: true,
            videoURL: bgVideoURL,
            channelId: spotlightItem?.id
        )
    }

    static func continueWatchingCard(
        _ item: WatchHistoryItem,
        localization: LocalizationManager
    ) -> CinematicHeroCard {
        CinematicHeroCard(
            id: "continue-watching",
            type: .continueWatching,
            title: item.title ?? localization.t("home.continueWatching"),
            subtitle: localization.t("cinematic.continueWatching.subtitle"),
            backgroundURL: item.thumbnail.flatMap { URL(string: $0) },
            showAIBadge: true,
            resumePosition: item.position
        )
    }

    static func podcastCard(
        from viewModel: HomeViewModel,
        localization: LocalizationManager
    ) -> CinematicHeroCard? {
        let podcastItem = viewModel.categories
            .flatMap(\.items)
            .first { $0.type?.lowercased() == "podcast" }
        guard let podcastItem else { return nil }

        return CinematicHeroCard(
            id: "podcast-\(podcastItem.id)",
            type: .podcast,
            title: podcastItem.title ?? localization.t("cinematic.podcast.title"),
            subtitle: localization.t("cinematic.podcast.title"),
            backgroundURL: (podcastItem.backdrop ?? podcastItem.thumbnail)
                .flatMap { URL(string: $0) },
            podcastEpisodeCount: podcastItem.totalEpisodes
        )
    }

    static func trendingCard(
        from viewModel: HomeViewModel,
        localization: LocalizationManager
    ) -> CinematicHeroCard? {
        guard !viewModel.trendingContent.isEmpty else { return nil }
        let first = viewModel.trendingContent[0]

        return CinematicHeroCard(
            id: "trending-\(first.id)",
            type: .trending,
            title: localization.t("cinematic.trending.title"),
            subtitle: first.title,
            backgroundAsset: "Masada",
            backgroundURL: first.imageUrl.flatMap { URL(string: $0) },
            trendingArticleCount: viewModel.trendingContent.count
        )
    }

    static func liveChannelCard(
        _ channel: LiveChannelItem,
        localization: LocalizationManager
    ) -> CinematicHeroCard {
        CinematicHeroCard(
            id: "channel-\(channel.id)",
            type: .liveChannel,
            title: channel.name ?? localization.t("nav.liveTV"),
            subtitle: channel.currentShow
                ?? localization.t("cinematic.liveTV.subtitle"),
            backgroundURL: (channel.thumbnail ?? channel.logo)
                .flatMap { URL(string: $0) },
            categoryLabel: localization.t("nav.liveTV"),
            channelId: channel.id
        )
    }
}
