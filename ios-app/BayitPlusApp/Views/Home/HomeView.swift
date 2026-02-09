import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Home screen with hero, spotlight carousel, and category rows
struct HomeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AppLocationProvider.self) private var locationProvider
    @State private var viewModel: HomeViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.xl) {
                    if vm.isLoading && vm.categories.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.categories.isEmpty {
                        errorState(error)
                    } else {
                        contentSections(vm)
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                locationProvider.requestLocationIfNeeded()
                viewModel = HomeViewModel(
                    repository: repos.content,
                    liveTVRepository: repos.liveTV,
                    locationProvider: locationProvider
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
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)

        // Hero carousel (auto-rotating, 6-second intervals)
        if !vm.spotlight.isEmpty {
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

        // City-specific content
        if let jerusalem = vm.jerusalemContent, !jerusalem.items.isEmpty {
            CityContentRow(title: "Jerusalem", items: jerusalem.items)
        }

        if let telAviv = vm.telAvivContent, !telAviv.items.isEmpty {
            CityContentRow(title: "Tel Aviv", items: telAviv.items)
        }

        // Category rows (movies, series, podcasts, audiobooks)
        ForEach(vm.categories) { category in
            CategoryRow(category: category, coordinator: coordinator)
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
