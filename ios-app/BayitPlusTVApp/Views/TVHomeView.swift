import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Home screen with hero carousel, continue watching, and content shelves.
/// Reuses HomeViewModel from the shared ViewModels.
struct TVHomeView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @Environment(TVOnboardingPreferences.self) var prefs
    @Environment(\.appConfiguration) private var appConfiguration
    @State var viewModel: HomeViewModel?
    @State var featuredCollections: [CollectionDetail] = []

    var body: some View {
        Group {
            if coordinator.categoryBrowseActive {
                TVCategoryBrowseView(
                    title: coordinator.categoryBrowseTitle,
                    icon: coordinator.categoryBrowseIcon,
                    categoryName: coordinator.categoryBrowseCategoryName,
                    repository: repos.content
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
                    mediaRepository: repos.media,
                    liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio,
                    locationProvider: TVLocationProvider(),
                    featureFlags: FeatureFlags(),
                    contentRowLimit: appConfiguration.homeContentRowLimit,
                    defaultCultureId: prefs.cultureId ?? appConfiguration.defaultCultureId,
                    hiddenChannelKeywords: appConfiguration.hiddenChannelKeywords
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

    private func contentSections(_ vm: HomeViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            // Personalized greeting
            greetingSection

            // Hero carousel with auto-rotation
            if !vm.spotlight.isEmpty {
                GlassHeroCarousel(items: vm.spotlight) { item in
                    TVHeroItem(
                        item: item,
                        onWatchNow: {
                            coordinator.fullscreenRoute = detailRoute(for: item)
                        },
                        onMoreInfo: {
                            coordinator.fullscreenRoute = detailRoute(for: item)
                        }
                    )
                }
            }

            // Continue watching (independent loader)
            TVContinueWatchingRow()

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

            // Live now channels with EPG (independent loader)
            TVLiveNowRow()

            // Trending recommendations (VOD based on news)
            TVTrendingRecommendationsRow()

            // Radio stations (filtered by interest)
            if prefs.showRadio, !vm.radioStations.isEmpty {
                radioStationsSection(vm.radioStations)
            }

            // All content sections filtered by onboarding interests
            ForEach(TVHomeSection.allCases, id: \.rawValue) { section in
                if section.hasData(in: vm), section.isVisible(given: prefs) {
                    renderSection(section, vm: vm)
                }
            }

            // Personalized recommendations (independent loader)
            TVRecommendedRow()

            // New releases (independent loader)
            TVNewReleasesRow()

            // Audio picks filtered by interests
            if prefs.showPodcasts || prefs.showAudiobooks {
                TVAudioPicksRow()
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
            citySection(localization.t("home.jerusalem"), items: vm.jerusalemContent?.items ?? [])
        case .telAviv:
            citySection(localization.t("home.telAviv"), items: vm.telAvivContent?.items ?? [])
        case .liveTV:
            liveChannelsSection(vm)
        default:
            if let category = section.category(from: vm) {
                categorySection(section, category: category)
            }
        }
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
