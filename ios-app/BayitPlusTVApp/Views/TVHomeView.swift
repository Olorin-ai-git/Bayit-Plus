import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS Home screen with hero carousel, continue watching, and content shelves.
/// Reuses HomeViewModel from the shared ViewModels.
struct TVHomeView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: HomeViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentSections(vm)
                }
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
            ShabbatModeService.shared.startPolling(repository: repos.shabbat)
            cacheTopShelfData()
        }
        .onAppear {
            // Refresh continue watching when returning to home
            Task {
                await viewModel?.refresh()
            }
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            // Hero carousel with auto-rotation
            if !vm.spotlight.isEmpty {
                GlassHeroCarousel(items: vm.spotlight) { item in
                    Button {
                        let contentType = TVContentTypeMapper.map(item.type)
                        coordinator.presentPlayer(
                            contentId: item.id,
                            contentType: contentType
                        )
                    } label: {
                        TVHeroItem(item: item)
                    }
                    .buttonStyle(.card)
                }
            }

            // Shabbat banner
            TVShabbatBannerView()
                .withAutoLoad()

            // All content sections in fixed order
            ForEach(TVHomeSection.allCases, id: \.rawValue) { section in
                if section.hasData(in: vm) {
                    renderSection(section, vm: vm)
                }
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
            title: "Continue Watching",
            icon: "play.circle.fill",
            items: vm.continueWatching,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .profile }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? "Untitled",
                subtitle: item.type,
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
                title: "Israelis in Your City",
                items: items,
                coverage: israelisResponse.coverage
            )
        }

        if let businessesResponse = vm.israeliBusinesses,
           let content = businessesResponse.content,
           let businesses = content.newsArticles, !businesses.isEmpty {
            TVLocationContentRow(
                title: "Israeli Businesses Near You",
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
    private func liveChannelsSection(_ vm: HomeViewModel) -> some View {
        TVContentSection(
            title: "Live TV",
            icon: "dot.radiowaves.left.and.right",
            items: vm.liveChannels,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .liveTV }
        ) { channel in
            TVContentCard(
                imageURL: channel.logo ?? channel.thumbnail,
                title: channel.name ?? "Channel",
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
    private func categorySection(_ section: TVHomeSection, category: ContentCategory) -> some View {
        TVContentSection(
            title: section.title,
            icon: section.icon,
            items: category.items,
            maxItems: 15,
            seeAllAction: { coordinator.selectedTab = seeAllTab(for: section) }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? "Untitled",
                badge: item.isSeries == true ? "Series" : nil,
                aspectRatio: section.aspectRatio,
                placeholderIcon: placeholderIcon(for: section),
                availableSubtitleLanguages: item.availableSubtitleLanguages
            ) {
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: TVContentTypeMapper.map(item.type)
                )
            }
        }
    }

    /// Routes "Show All" to the correct tab based on section type.
    private func seeAllTab(for section: TVHomeSection) -> TVTab {
        switch section {
        case .podcasts, .audiobooks: return .podcasts
        case .kids, .youngsters: return .kids
        case .liveTV: return .liveTV
        case .continueWatching: return .profile
        default: return .vod
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
            TopShelfCachedItem(id: item.id, title: item.title ?? "Untitled", imageURL: item.thumbnail)
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
            Text("Loading...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

// MARK: - Shared TV Error State

func tvErrorState(
    _ message: String,
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

        GlassButton("Retry", variant: .secondary, size: .large, action: retry)
            .frame(maxWidth: 300)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, TVDesignTokens.Spacing.xxxxl)
}
