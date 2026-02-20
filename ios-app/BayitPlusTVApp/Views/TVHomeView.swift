import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Home screen with hero carousel, continue watching, and content shelves.
/// Reuses HomeViewModel from the shared ViewModels.
struct TVHomeView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: HomeViewModel?
    @State private var featuredCollections: [CollectionDetail] = []

    var body: some View {
        Group {
            if coordinator.categoryBrowseActive {
                TVCategoryBrowseView(
                    title: coordinator.categoryBrowseTitle,
                    icon: coordinator.categoryBrowseIcon,
                    items: coordinator.categoryBrowseItems
                )
            } else {
                homeScrollView
            }
        }
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea(.container, edges: .horizontal)
        .task {
            if viewModel == nil {
                viewModel = HomeViewModel(
                    repository: repos.content,
                    liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio,
                    locationProvider: TVLocationProvider(),
                    featureFlags: FeatureFlags()
                )
            }
            await viewModel?.loadFeatured()
            await loadFeaturedCollections()
            ShabbatModeService.shared.startPolling(repository: repos.shabbat)
            cacheTopShelfData()
        }
        .onAppear {
            Task {
                await viewModel?.refresh()
            }
        }
        .onExitCommand {
            if coordinator.categoryBrowseActive {
                coordinator.dismissCategoryBrowse()
            }
        }
    }

    private var homeScrollView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    TVSkeletonHomeView()
                } else if let error = vm.error, vm.categories.isEmpty {
                    tvErrorState(error, retryLabel: localization.t("common.retry")) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            // Hero carousel with auto-rotation
            if !vm.spotlight.isEmpty {
                GlassHeroCarousel(items: vm.spotlight) { item in
                    TVHeroItem(
                        item: item,
                        onWatchNow: {
                            let contentType = TVContentTypeMapper.map(item.type)
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: contentType
                            )
                        },
                        onMoreInfo: {
                            coordinator.fullscreenRoute = detailRoute(for: item)
                        }
                    )
                }
            }

            // Featured collections carousel
            if !featuredCollections.isEmpty {
                TVFeaturedCollectionsCarousel(collections: featuredCollections)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }

            // Shabbat banner
            TVShabbatBannerView()
                .withAutoLoad()

            // Shabbat Eve section (Friday before candle lighting)
            TVShabbatEveView()

            // Radio stations
            if !vm.radioStations.isEmpty {
                radioStationsSection(vm.radioStations)
            }

            // All content sections in fixed order
            ForEach(TVHomeSection.allCases, id: \.rawValue) { section in
                if section.hasData(in: vm) {
                    renderSection(section, vm: vm)
                }
            }

            // Dynamic culture city rows (beyond Jerusalem and Tel Aviv)
            ForEach(vm.cultureCities) { cityWithContent in
                dynamicCitySection(
                    cityName: cityWithContent.city.name,
                    items: cityWithContent.content.items
                )
            }
        }
    }

    @ViewBuilder
    private func renderSection(_ section: TVHomeSection, vm: HomeViewModel) -> some View {
        switch section {
        case .continueWatching:
            continueWatchingSection(vm)
        case .nearMe:
            nearMeSection(vm)
        case .whatsHot:
            trendingSection(vm)
        case .jerusalem:
            citySection("Jerusalem", items: vm.jerusalemContent?.items ?? [])
        case .telAviv:
            citySection("Tel Aviv", items: vm.telAvivContent?.items ?? [])
        case .liveTV:
            liveChannelsSection(vm)
        default:
            if let category = section.category(from: vm) {
                categorySection(section, category: category)
            }
        }
    }

    @ViewBuilder
    private func continueWatchingSection(_ vm: HomeViewModel) -> some View {
        TVContentSection(
            title: localization.t("home.continueWatching"),
            icon: "play.circle.fill",
            items: vm.continueWatching,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .profile }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? localization.t("common.untitled"),
                subtitle: item.type,
                progress: item.progress,
                aspectRatio: 2.0/3.0,
                placeholderIcon: "play.circle.fill"
            ) {
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: TVContentTypeMapper.map(item.type)
                )
            }
        }
    }

    @ViewBuilder
    private func nearMeSection(_ vm: HomeViewModel) -> some View {
        if let israelisResponse = vm.israelisInCity,
           let content = israelisResponse.content,
           let newsArticles = content.newsArticles, !newsArticles.isEmpty {
            let items = newsArticles + (content.communityEvents ?? [])
            TVLocationContentRow(
                title: localization.t("home.israelisInCity"),
                items: items,
                coverage: israelisResponse.coverage
            )
        }

        if let businessesResponse = vm.israeliBusinesses,
           let content = businessesResponse.content,
           let businesses = content.newsArticles, !businesses.isEmpty {
            TVLocationContentRow(
                title: localization.t("home.israeliBusinesses"),
                items: businesses,
                coverage: businessesResponse.coverage
            )
        }
    }

    @ViewBuilder
    private func trendingSection(_ vm: HomeViewModel) -> some View {
        TVTrendingRow(items: vm.trendingContent)
    }

    @ViewBuilder
    private func citySection(_ cityName: String, items: [CityContentItem]) -> some View {
        TVCityContentRow(title: cityName, items: items)
    }

    @ViewBuilder
    private func dynamicCitySection(cityName: String, items: [CultureItem]) -> some View {
        TVContentSection(
            title: cityName,
            icon: "building.2",
            items: items,
            maxItems: 4
        ) { item in
            TVContentCard(
                imageURL: item.imageUrl,
                title: item.title ?? cityName,
                subtitle: item.category,
                aspectRatio: 16.0/9.0,
                placeholderIcon: "photo"
            ) {
                if let urlString = item.contentUrl, let url = URL(string: urlString) {
                    coordinator.presentWebView(url: url, title: item.title ?? cityName)
                }
            }
        }
    }

    @ViewBuilder
    private func liveChannelsSection(_ vm: HomeViewModel) -> some View {
        TVContentSection(
            title: localization.t("home.liveTV"),
            icon: "dot.radiowaves.left.and.right",
            items: vm.liveChannels,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .liveTV }
        ) { channel in
            TVContentCard(
                imageURL: channel.logo ?? channel.thumbnail,
                title: channel.name ?? localization.t("liveTV.channel"),
                subtitle: channel.currentShow,
                badge: "LIVE",
                aspectRatio: 1.0,
                placeholderIcon: "tv"
            ) {
                coordinator.presentPlayer(
                    contentId: channel.id,
                    contentType: .liveTV,
                    channelId: channel.id
                )
            }
        }
    }

    @ViewBuilder
    private func radioStationsSection(_ stations: [RadioStationItem]) -> some View {
        TVContentSection(
            title: localization.t("home.radio"),
            icon: "radio",
            items: stations,
            maxItems: 8,
            seeAllAction: { coordinator.selectedTab = .podcasts }
        ) { station in
            TVContentCard(
                imageURL: station.logo,
                title: station.name ?? localization.t("nav.radio"),
                subtitle: station.currentSong ?? station.currentShow,
                aspectRatio: 1.0,
                placeholderIcon: "radio"
            ) {
                coordinator.presentPlayer(
                    contentId: station.id,
                    contentType: .radio
                )
            }
        }
    }

    @ViewBuilder
    private func categorySection(_ section: TVHomeSection, category: ContentCategory) -> some View {
        TVContentSection(
            title: section.localizedTitle(localization),
            icon: section.icon,
            items: category.items,
            maxItems: 15,
            seeAllAction: {
                coordinator.presentCategoryBrowse(
                    title: section.localizedTitle(localization),
                    icon: section.icon,
                    items: category.items
                )
            }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? localization.t("common.untitled"),
                badge: item.type?.lowercased() == "series" ? localization.t("home.series") : nil,
                aspectRatio: section.aspectRatio,
                placeholderIcon: placeholderIcon(for: section),
                availableSubtitleLanguages: item.availableSubtitleLanguages
            ) {
                navigateToCategoryItem(item, section: section)
            }
        }
    }

    private func navigateToCategoryItem(_ item: ContentItem, section: TVHomeSection) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        } else {
            switch section {
            case .podcasts:
                coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
            case .audiobooks:
                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
            case .series, .israeliSeries:
                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
            case .movies, .israeliMovies, .kids, .youngsters, .music, .documentary:
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            default:
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: TVContentTypeMapper.map(item.type)
                )
            }
        }
    }

    private func loadFeaturedCollections() async {
        do {
            featuredCollections = try await repos.content.fetchCollectionRecommendations()
        } catch {
            // Collection banner is optional - fail silently
        }
    }

    /// Maps a spotlight item to the appropriate detail route.
    private func detailRoute(for item: SpotlightItem) -> TVRoute {
        let type = item.type?.lowercased() ?? ""
        switch type {
        case "series":
            return .seriesDetail(seriesId: item.id)
        case "podcast", "podcast_episode":
            return .podcastDetail(showId: item.id)
        case "audiobook", "audiobook_chapter":
            return .audiobookDetail(audiobookId: item.id)
        default:
            return .movieDetail(movieId: item.id)
        }
    }

    /// Returns placeholder icon for content type
    private func placeholderIcon(for section: TVHomeSection) -> String {
        switch section {
        case .liveTV: return "tv"
        case .israeliMovies, .movies: return "film"
        case .israeliSeries, .series: return "tv.fill"
        case .kids, .youngsters: return "figure.2"
        case .music: return "music.note"
        case .documentary: return "doc.text.image"
        case .podcasts: return "mic.fill"
        case .audiobooks: return "headphones"
        default: return "film"
        }
    }

    /// Cache continue watching and trending data for the Top Shelf extension.
    private func cacheTopShelfData() {
        guard let vm = viewModel else { return }

        let continueItems = vm.continueWatching.prefix(10).map { item in
            TopShelfCachedItem(id: item.id, title: item.title ?? localization.t("common.untitled"), imageURL: item.thumbnail)
        }
        TopShelfDataProvider.cacheContinueWatching(Array(continueItems))

        let trendingItems = vm.trendingContent.prefix(10).map { item in
            TopShelfCachedItem(id: item.id, title: item.title, imageURL: nil)
        }
        TopShelfDataProvider.cacheTrending(trendingItems)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

// MARK: - Shared TV Error State

func tvErrorState(
    _ message: String,
    retryLabel: String = "Retry",
    retry: @escaping () -> Void
) -> some View {
    VStack(spacing: TVDesignTokens.Spacing.xl) {
        Image(systemName: "exclamationmark.triangle")
            .font(.system(size: TVDesignTokens.FontSize.hero))
            .foregroundStyle(DesignTokens.Warning.default)

        Text(message)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 600)

        GlassButton(retryLabel, variant: .secondary, size: .large, action: retry)
            .frame(maxWidth: 300)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, TVDesignTokens.Spacing.xxxxl)
}
