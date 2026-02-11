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
        .task {
            if viewModel == nil {
                viewModel = HomeViewModel(
                    repository: repos.content,
                    liveTVRepository: repos.liveTV,
                    locationProvider: TVLocationProvider(),
                    featureFlags: FeatureFlags()
                )
            }
            await viewModel?.loadFeatured()
            ShabbatModeService.shared.startPolling(repository: repos.shabbat)
            cacheTopShelfData()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            TVPageHeader(icon: "house.fill", title: "Home")

            TVShabbatBannerView()
                .withAutoLoad()

            // Culture clocks - equal width side by side
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                TVCultureClock(
                    flagEmoji: "\u{1F1EE}\u{1F1F1}",
                    locationLabel: "Time in Israel",
                    timezone: TimeZone(identifier: "Asia/Jerusalem")!,
                    isIsraeli: true
                )

                TVCultureClock(
                    flagEmoji: "\u{1F1FA}\u{1F1F8}",
                    locationLabel: "Time in New York, NY",
                    timezone: TimeZone(identifier: "America/New_York")!,
                    isIsraeli: false
                )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            // Hero carousel
            if !vm.spotlight.isEmpty {
                GlassHeroCarousel(items: vm.spotlight) { item in
                    heroItem(item)
                        .onLongPressGesture(minimumDuration: 0) {
                            let contentType = TVContentTypeMapper.map(item.type)
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: contentType
                            )
                        }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }

            // Continue Watching
            if !vm.continueWatching.isEmpty {
                GlassContentShelf(
                    title: "Continue Watching",
                    items: vm.continueWatching
                ) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        subtitle: item.type,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: TVContentTypeMapper.map(item.type)
                            )
                        }
                    )
                }
            }

            // Live TV
            if !vm.liveChannels.isEmpty {
                tvLiveChannelsShelf(vm.liveChannels)
            }

            // Location-based sections
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

            // Trending
            if !vm.trendingContent.isEmpty {
                TVTrendingRow(items: vm.trendingContent)
            }

            // City content
            if let jerusalem = vm.jerusalemContent, !jerusalem.items.isEmpty {
                TVCityContentRow(title: "Jerusalem", items: jerusalem.items)
            }

            if let telAviv = vm.telAvivContent, !telAviv.items.isEmpty {
                TVCityContentRow(title: "Tel Aviv", items: telAviv.items)
            }

            // Category rows
            ForEach(vm.categories) { category in
                GlassContentShelf(title: category.name, items: category.items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        badge: item.isSeries == true ? "Series" : nil,
                        aspectRatio: posterAspectRatio(for: category.name),
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: TVContentTypeMapper.map(item.type)
                            )
                        }
                    )
                }
            }
        }
    }

    // MARK: - Hero Item

    private func heroItem(_ item: SpotlightItem) -> some View {
        ZStack(alignment: .bottomLeading) {
            // Background image - fills from top, clips overflow at bottom
            Color.clear
                .overlay(alignment: .top) {
                    if let urlStr = item.backdrop ?? item.thumbnail,
                       let url = URL(string: urlStr) {
                        AsyncImage(url: url) { phase in
                            if case .success(let img) = phase {
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                DesignTokens.Glass.purpleLight
                            }
                        }
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
                .clipped()

            // Full-width gradient overlay from bottom
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.0),
                    .init(color: DesignTokens.Background.primary.opacity(0.3), location: 0.35),
                    .init(color: DesignTokens.Background.primary.opacity(0.8), location: 0.7),
                    .init(color: DesignTokens.Background.primary, location: 1.0)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Text content at bottom-left
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.title ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                    .lineLimit(2)

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let year = item.year {
                        metadataText(String(year))
                    }
                    if let duration = item.duration {
                        metadataText(duration)
                    }
                    if let rating = item.rating {
                        ratingBadge(rating.value)
                    }
                }

                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                        .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xl)
        }
    }

    private func posterAspectRatio(for categoryName: String) -> CGFloat {
        let name = categoryName.lowercased()
        if name.contains("podcast") || name.contains("audiobook") {
            return 1.0
        }
        return 2.0 / 3.0
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

    private func metadataText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.secondary)
            .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
    }

    private func ratingBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    private func tvLiveChannelsShelf(_ channels: [LiveChannelItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "tv.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundColor(DesignTokens.Primary.p500)

                Text("Live TV")
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(channels) { channel in
                        GlassFocusPoster(
                            thumbnailURL: channel.logo ?? channel.thumbnail,
                            title: channel.name ?? "Channel",
                            subtitle: channel.currentShow,
                            badge: "LIVE",
                            aspectRatio: 16 / 9,
                            onSelect: {
                                coordinator.presentPlayer(
                                    contentId: channel.id,
                                    contentType: .liveTV,
                                    channelId: channel.id
                                )
                            }
                        )
                        .tvFocusStyle()
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .focusSection()
        }
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(Color.white.opacity(0.04))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(.ultraThinMaterial.opacity(0.2))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
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
