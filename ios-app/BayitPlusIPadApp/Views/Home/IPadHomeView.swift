import BayitDesignSystem
import BayitLocalization
import BayitWidgetShared
import SwiftUI

/// iPad-optimized home screen with wider grid layouts and full-width hero
struct IPadHomeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AppLocationProvider.self) private var locationProvider
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(LocalizationManager.self) private var localization
    @Environment(WidgetDataSyncService.self) private var widgetSync
    @State private var viewModel: HomeViewModel?
    @State private var cardActions: CardActionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    if vm.isLoading && vm.categories.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.categories.isEmpty {
                        errorState(error)
                    } else {
                        contentSections(vm)
                    }
                }
                .padding(.top, DesignTokens.Spacing.md)
            } else {
                ScreenLoadingView()
            }
        }
        .scrollContentBackground(.hidden)
        .background(DesignTokens.Background.primary)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .refreshable { await viewModel?.refresh() }
        .task {
            if cardActions == nil {
                cardActions = CardActionsViewModel(userRepository: repos.user, widgetRepository: repos.widget)
            }
            if viewModel == nil {
                locationProvider.requestLocationIfNeeded()
                viewModel = HomeViewModel(
                    repository: repos.content, liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio, locationProvider: locationProvider,
                    featureFlags: featureFlags, categoryRepository: repos.category,
                    widgetSync: widgetSync
                )
            }
            await viewModel?.loadFeatured()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        PageHeader(icon: "house.fill", title: "Home")
        HStack(spacing: DesignTokens.Spacing.xl) {
            CultureClock(flagEmoji: "🇮🇱", locationLabel: "Time in Israel",
                         timezone: TimeZone(identifier: "Asia/Jerusalem")!, isIsraeli: true)
            Spacer()
            CultureClock(flagEmoji: "🇺🇸", locationLabel: "Time in New York, NY",
                         timezone: TimeZone(identifier: "America/New_York")!, isIsraeli: false)
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.bottom, DesignTokens.Spacing.md)

        ShabbatBannerView()
        ShabbatEveView()

        if featureFlags.isLegacyFeaturesEnabled && !vm.spotlight.isEmpty {
            HeroCarousel(items: vm.spotlight, coordinator: coordinator)
        }
        if !vm.continueWatching.isEmpty {
            ContinueWatchingRow(items: vm.continueWatching, coordinator: coordinator)
        }
        if !vm.featuredCollections.isEmpty {
            FeaturedCollectionsCarousel(collections: vm.featuredCollections)
                .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        if !vm.liveChannels.isEmpty { LiveTVRow(channels: vm.liveChannels, coordinator: coordinator) }
        if !vm.radioStations.isEmpty { RadioStationsRow(stations: vm.radioStations) }

        if let r = vm.israelisInCity, let c = r.content, let articles = c.newsArticles, !articles.isEmpty {
            LocationContentRow(title: "Israelis in Your City",
                               items: articles + (c.communityEvents ?? []), coverage: r.coverage)
        }
        if let r = vm.israeliBusinesses, let c = r.content, let biz = c.newsArticles, !biz.isEmpty {
            LocationContentRow(title: "Israeli Businesses Near You", items: biz, coverage: r.coverage)
        }

        if !vm.trendingContent.isEmpty { TrendingRow(items: vm.trendingContent, coordinator: coordinator) }
        if !vm.youngstersTrending.isEmpty {
            IPadYoungstersSection(items: vm.youngstersTrending, localization: localization, coordinator: coordinator)
        }
        if let j = vm.jerusalemContent, !j.items.isEmpty {
            CityContentRow(title: "Jerusalem", items: j.items) { coordinator.navigate(to: .jerusalemContent) }
        }
        if let t = vm.telAvivContent, !t.items.isEmpty {
            CityContentRow(title: "Tel Aviv", items: t.items) { coordinator.navigate(to: .telAvivContent) }
        }
        ForEach(vm.cultureCities) { city in
            DynamicCityContentRow(cityName: city.city.name, items: city.content.items,
                                  accentColor: DesignTokens.Primary.p400)
        }
        ForEach(vm.categories.filter { category in
            let name = category.name.lowercased()
            let hidden = ["movie", "series", "audiobook", "kid", "children", "music", "documentar"]
            return featureFlags.isLegacyFeaturesEnabled || !hidden.contains(where: { name.contains($0) })
        }) { category in
            CategoryRow(category: category, coordinator: coordinator, cardActions: cardActions)
        }
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 200)
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .accessibilityHidden(true)
            }
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading content")
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Warning.default)
                .accessibilityHidden(true)
            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)
            GlassButton("Retry", variant: .secondary, size: .medium) {
                Task { await viewModel?.refresh() }
            }
            .accessibilityHint("Double tap to reload content")
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
        .accessibilityElement(children: .combine)
    }
}

/// iPad youngsters row extracted to stay within the 200-line file limit
private struct IPadYoungstersSection: View {
    let items: [SectionContentItem]
    let localization: LocalizationManager
    let coordinator: NavigationCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("youngsters.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Button { coordinator.navigate(to: .youngsters) } label: {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(localization.t("common.showAll"))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Image(systemName: "chevron.right")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .accessibilityLabel("Show all Youngsters content")
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassCarousel(items: items, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    aspectRatio: 2.0 / 3.0,
                    width: 160,
                    onTap: {
                        coordinator.presentFullscreen(.player(contentId: item.id, contentType: .movie))
                    }
                )
            }
        }
    }
}
