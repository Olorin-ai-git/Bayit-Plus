import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Cinematic home experience with full-screen hero carousel,
/// parallax scroll, and floating dock navigation.
struct CinematicHomeView: View {
    let viewModel: HomeViewModel

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(UserUIPreferencesStore.self) private var uiPreferences

    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var heroCards: [CinematicHeroCard] = []
    @State private var currentIndex = 0
    @State private var scrollProgress: CGFloat = 0

    private var isIPad: Bool {
        sizeClass == .regular
    }

    var body: some View {
        HStack(spacing: 0) {
            if isIPad {
                IPadCinematicSidebar(
                    showContinueWatching: !viewModel.continueWatching.isEmpty,
                    showPlex: !byocManager.plexItems.isEmpty,
                    showYouTube: !byocManager.youtubeItems.isEmpty,
                    onNavigate: handleDockNavigation
                )
            }

            ZStack(alignment: .bottom) {
                scrollContent
                if !isIPad {
                    CinematicDock(
                        showContinueWatching: !viewModel
                            .continueWatching.isEmpty,
                        showPlex: !byocManager.plexItems.isEmpty,
                        showYouTube: !byocManager.youtubeItems.isEmpty,
                        scrollProgress: scrollProgress,
                        onNavigate: handleDockNavigation
                    )
                }
            }
        }
        .ignoresSafeArea(edges: .top)
        .background(DesignTokens.Background.primary)
        .task {
            heroCards = CinematicHeroCard.buildHeroCards(
                from: viewModel,
                byocManager: byocManager,
                localization: localization
            )
        }
    }

    // MARK: - Scroll Content

    private var scrollContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 0) {
                scrollOffsetTracker

                ZStack(alignment: .top) {
                    CinematicHeroSection(
                        heroCards: heroCards,
                        currentIndex: $currentIndex,
                        scrollProgress: scrollProgress,
                        onToggleStyle: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                uiPreferences.homepageStyle = "classic"
                            }
                        },
                        onCardAction: handleHeroAction
                    )

                    // Shabbat + Credits overlays on hero
                    VStack(spacing: DesignTokens.Spacing.xs) {
                        ShabbatBannerView()
                        CreditsBadgeView()
                    }
                    .padding(.top, DesignTokens.Spacing.xxxxl)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .opacity(max(0, 1.0 - Double(scrollProgress) * 2))
                    .allowsHitTesting(scrollProgress < 0.3)
                }

                contentRows
                    .padding(.top, DesignTokens.Spacing.lg)
            }
        }
        .coordinateSpace(name: "cinematic")
        .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
            let heroHeight = UIScreen.main.bounds.height
            scrollProgress = min(1.0, max(0, -offset / heroHeight))
        }
    }

    // MARK: - Scroll Offset Tracker

    private var scrollOffsetTracker: some View {
        GeometryReader { geometry in
            Color.clear.preference(
                key: ScrollOffsetPreferenceKey.self,
                value: geometry.frame(in: .named("cinematic")).minY
            )
        }
        .frame(height: 0)
    }

    // MARK: - Content Rows

    private var contentRows: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            BYOCShelfRow()

            if !viewModel.continueWatching.isEmpty {
                ContinueWatchingRow(
                    items: viewModel.continueWatching,
                    coordinator: coordinator
                )
            }

            if !viewModel.liveChannels.isEmpty {
                LiveTVRow(channels: viewModel.liveChannels, coordinator: coordinator)
            }

            if !viewModel.trendingContent.isEmpty {
                TrendingRow(items: viewModel.trendingContent, coordinator: coordinator)
            }

            if let jerusalem = viewModel.jerusalemContent {
                CityContentRow(
                    title: localization.t("jerusalem.title"),
                    items: jerusalem.items
                )
            }

            if let telAviv = viewModel.telAvivContent {
                CityContentRow(
                    title: localization.t("telAviv.title"),
                    items: telAviv.items
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.xxxxl)
    }

    // MARK: - Hero Action Navigation

    private func handleHeroAction(
        card: CinematicHeroCard,
        action: CinematicHeroAction
    ) {
        switch card.type {
        case .liveAIShowcase, .liveChannel:
            if let channelId = card.channelId {
                coordinator.navigate(
                    to: .player(
                        contentId: channelId,
                        contentType: .liveTV
                    )
                )
            }
        case .byocShowcase:
            if let url = card.videoURL {
                coordinator.navigate(
                    to: .player(
                        contentId: card.id,
                        contentType: .movie
                    )
                )
            }
        case .movieAIShowcase:
            if action == .secondary, let movieId = card.channelId {
                coordinator.navigate(to: .movieDetail(movieId: movieId))
            } else if let item = byocManager.plexItems.first
                ?? byocManager.youtubeItems.first,
                item.streamURL != nil
            {
                coordinator.navigate(
                    to: .player(contentId: item.id, contentType: .movie)
                )
            } else if let spotlightItem = viewModel.spotlight.first {
                coordinator.navigate(
                    to: .player(
                        contentId: spotlightItem.id,
                        contentType: .movie
                    )
                )
            }
        case .continueWatching:
            if let item = viewModel.continueWatching.first {
                if action == .secondary {
                    coordinator.navigate(
                        to: .movieDetail(movieId: item.id)
                    )
                } else {
                    coordinator.navigate(
                        to: .player(contentId: item.id, contentType: .movie)
                    )
                }
            }
        case .podcast:
            if let contentItem = card.contentItem {
                coordinator.navigate(
                    to: .player(
                        contentId: contentItem.id,
                        contentType: .podcast
                    )
                )
            }
        case .trending:
            coordinator.selectedTab = .discover
        }
    }

    // MARK: - Dock Navigation

    private func handleDockNavigation(_ destination: CinematicDockItem) {
        switch destination {
        case .discover:
            coordinator.selectedTab = .discover
        case .liveTV:
            coordinator.selectedTab = .liveTV
        case .listen:
            coordinator.selectedTab = .podcasts
        case .continueWatching:
            if let item = viewModel.continueWatching.first {
                coordinator.navigate(
                    to: .player(contentId: item.id, contentType: .movie)
                )
            }
        case .plex, .youtube:
            coordinator.selectedTab = .home
        }
    }
}

// MARK: - Scroll Offset Preference Key

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
