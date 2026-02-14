import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Home screen with hero, spotlight carousel, and category rows
struct HomeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AppLocationProvider.self) private var locationProvider
    @Environment(FeatureFlags.self) private var featureFlags
    @Environment(LocalizationManager.self) private var localization
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
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if cardActions == nil {
                cardActions = CardActionsViewModel(
                    userRepository: repos.user,
                    widgetRepository: repos.widget
                )
            }
            if viewModel == nil {
                locationProvider.requestLocationIfNeeded()
                viewModel = HomeViewModel(
                    repository: repos.content,
                    liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio,
                    locationProvider: locationProvider,
                    featureFlags: featureFlags,
                    categoryRepository: repos.category
                )
            }
            await viewModel?.loadFeatured()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        // Page header with Home icon and title
        PageHeader(icon: "house.fill", title: "Home")

        // Culture clocks
        HStack(spacing: DesignTokens.Spacing.md) {
            CultureClock(
                flagEmoji: "🇮🇱",
                locationLabel: "Time in Israel",
                timezone: TimeZone(identifier: "Asia/Jerusalem")!,
                isIsraeli: true
            )

            Spacer()

            CultureClock(
                flagEmoji: "🇺🇸",
                locationLabel: "Time in New York, NY",
                timezone: TimeZone(identifier: "America/New_York")!,
                isIsraeli: false
            )
        }
        .padding(.leading, DesignTokens.Spacing.lg + 4)
        .padding(.trailing, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)

        // Hero carousel (legacy feature - controlled by feature flag)
        if featureFlags.isLegacyFeaturesEnabled && !vm.spotlight.isEmpty {
            HeroCarousel(items: vm.spotlight, coordinator: coordinator)
        }

        // Continue Watching (only if has items)
        if !vm.continueWatching.isEmpty {
            ContinueWatchingRow(items: vm.continueWatching, coordinator: coordinator)
        }

        // Live TV row
        if !vm.liveChannels.isEmpty {
            LiveTVRow(channels: vm.liveChannels, coordinator: coordinator)
        }

        // Radio stations row
        if !vm.radioStations.isEmpty {
            RadioStationsRow(stations: vm.radioStations, coordinator: coordinator)
        }

        // Location-based sections
        if let israelisResponse = vm.israelisInCity,
           let content = israelisResponse.content,
           let newsArticles = content.newsArticles, !newsArticles.isEmpty {
            let items = newsArticles + (content.communityEvents ?? [])
            LocationContentRow(
                title: "Israelis in Your City",
                items: items,
                coverage: israelisResponse.coverage
            )
        }

        if let businessesResponse = vm.israeliBusinesses,
           let content = businessesResponse.content,
           let businesses = content.newsArticles, !businesses.isEmpty {
            LocationContentRow(
                title: "Israeli Businesses Near You",
                items: businesses,
                coverage: businessesResponse.coverage
            )
        }

        // Trending content (What's Hot in Israel)
        if !vm.trendingContent.isEmpty {
            TrendingRow(items: vm.trendingContent, coordinator: coordinator)
        }

        // Youngsters section
        if !vm.youngstersTrending.isEmpty {
            youngstersSection(vm)
        }

        // City-specific content
        if let jerusalem = vm.jerusalemContent, !jerusalem.items.isEmpty {
            CityContentRow(title: "Jerusalem", items: jerusalem.items) {
                coordinator.navigate(to: .jerusalemContent)
            }
        }

        if let telAviv = vm.telAvivContent, !telAviv.items.isEmpty {
            CityContentRow(title: "Tel Aviv", items: telAviv.items) {
                coordinator.navigate(to: .telAvivContent)
            }
        }

        // Category rows (Movies, Series, Audiobooks, Kids, Music, Documentary are legacy features)
        ForEach(vm.categories.filter { category in
            let name = category.name.lowercased()
            let hidden = ["movie", "series", "audiobook", "kid", "children", "music", "documentar"]
            if featureFlags.isLegacyFeaturesEnabled {
                return true
            } else {
                return !hidden.contains(where: { name.contains($0) })
            }
        }) { category in
            CategoryRow(
                category: category,
                coordinator: coordinator,
                cardActions: cardActions
            )
        }
    }

    // MARK: - Youngsters Section

    private func youngstersSection(_ vm: HomeViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("youngsters.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                Spacer()

                Button {
                    coordinator.navigate(to: .youngsters)
                } label: {
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
            .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: vm.youngstersTrending, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    aspectRatio: 2.0 / 3.0,
                    width: 160
                ) {
                    coordinator.navigate(to: .movieDetail(movieId: item.id))
                }
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 180)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
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
