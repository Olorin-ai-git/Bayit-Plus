import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS Home screen with hero carousel, continue watching, and content shelves.
/// Reuses HomeViewModel from the shared ViewModels.
struct TVHomeView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: HomeViewModel?

    /// Max items visible in one row without scrolling.
    /// 1920pt screen - 56pt padding each side = 1808pt usable.
    /// 300pt poster + 40pt focus gap = 340pt per slot -> ~5 items.
    static let maxItemsPerRow = 5

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
                        heroItem(item)
                    }
                    .buttonStyle(.card)
                }
            }

            TVShabbatBannerView()
                .withAutoLoad()

            // 1. Near Me (first content section)
            nearMeSections(vm)

            // Continue Watching
            if !vm.continueWatching.isEmpty {
                GlassContentShelf(
                    title: "Continue Watching",
                    icon: "play.circle.fill",
                    items: vm.continueWatching,
                    maxItems: TVHomeView.maxItemsPerRow,
                    seeAllAction: { coordinator.selectedTab = .favorites }
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
                .focusSection()
            }

            // 2. What's Hot in Israel
            if !vm.trendingContent.isEmpty {
                TVTrendingRow(items: vm.trendingContent)
            }

            // 3. Tel Aviv
            if let telAviv = vm.telAvivContent, !telAviv.items.isEmpty {
                TVCityContentRow(title: "Tel Aviv", items: telAviv.items)
            }

            // 4. Jerusalem
            if let jerusalem = vm.jerusalemContent, !jerusalem.items.isEmpty {
                TVCityContentRow(title: "Jerusalem", items: jerusalem.items)
            }

            // 5. Live TV
            if !vm.liveChannels.isEmpty {
                tvLiveChannelsShelf(vm.liveChannels)
            }

            // 6-13. Category rows in explicit order
            ForEach(sortedCategories(vm.categories)) { category in
                categoryShelf(category)
            }
        }
    }

    @ViewBuilder
    private func nearMeSections(_ vm: HomeViewModel) -> some View {
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

    private func categoryShelf(_ category: ContentCategory) -> some View {
        GlassContentShelf(
            title: category.name.replacingOccurrences(of: "-", with: " ").localizedCapitalized,
            icon: categoryIcon(for: category.name),
            items: category.items,
            maxItems: TVHomeView.maxItemsPerRow,
            seeAllAction: { coordinator.selectedTab = seeAllTab(for: category.name) }
        ) { item in
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
            .overlay(alignment: .bottomLeading) {
                subtitleFlagsOverlay(for: item)
            }
        }
    }

    /// Sort categories to match the desired home screen order.
    private func sortedCategories(_ categories: [ContentCategory]) -> [ContentCategory] {
        let order: [(String) -> Bool] = [
            { $0.contains("israeli") && $0.contains("movie") },
            { $0.contains("israeli") && $0.contains("series") },
            { $0.contains("movie") && !$0.contains("israeli") },
            { $0.contains("kid") || $0.contains("children") },
            { $0.contains("document") },
            { $0.contains("series") && !$0.contains("israeli") },
            { $0.contains("podcast") },
            { $0.contains("audiobook") },
        ]

        return categories.sorted { a, b in
            let aName = a.name.lowercased()
            let bName = b.name.lowercased()
            let aIndex = order.firstIndex(where: { $0(aName) }) ?? order.count
            let bIndex = order.firstIndex(where: { $0(bName) }) ?? order.count
            return aIndex < bIndex
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

    /// Routes "Show All" to the correct tab based on category name.
    private func seeAllTab(for categoryName: String) -> TVTab {
        let name = categoryName.lowercased()
        if name.contains("podcast") { return .podcasts }
        if name.contains("audiobook") { return .audiobooks }
        if name.contains("kid") || name.contains("children") { return .children }
        return .vod
    }

    /// SF Symbol icon for a category name.
    private func categoryIcon(for categoryName: String) -> String {
        let name = categoryName.lowercased()
        if name.contains("israeli") && name.contains("movie") { return "film.fill" }
        if name.contains("israeli") && name.contains("series") { return "tv.fill" }
        if name.contains("movie") { return "film" }
        if name.contains("series") { return "tv" }
        if name.contains("kid") || name.contains("children") { return "figure.and.child.holdinghands" }
        if name.contains("document") { return "doc.text.image" }
        if name.contains("podcast") { return "mic.fill" }
        if name.contains("audiobook") { return "headphones" }
        return "square.grid.2x2"
    }

    @ViewBuilder
    private func subtitleFlagsOverlay(for item: ContentItem) -> some View {
        if let languages = item.availableSubtitleLanguages, !languages.isEmpty {
            SubtitleFlagsPill(
                languages: languages,
                aiLanguages: [],
                size: .medium
            )
            .padding(.leading, TVDesignTokens.Spacing.sm)
            .padding(.bottom, 90)
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

    // MARK: - Channel Card

    private func tvChannelCard(_ channel: LiveChannelItem) -> some View {
        let imageURL = channel.logo ?? channel.thumbnail
        return Button {
            coordinator.presentPlayer(
                contentId: channel.id,
                contentType: .liveTV,
                channelId: channel.id
            )
        } label: {
            ZStack(alignment: .bottom) {
                // Image or branded fallback
                Color.clear
                    .aspectRatio(1.0, contentMode: .fit)
                    .overlay {
                        if let urlStr = imageURL, let url = URL(string: urlStr) {
                            AsyncImage(url: url) { phase in
                                if case .success(let img) = phase {
                                    img.resizable().aspectRatio(contentMode: .fit)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                } else {
                                    channelPlaceholder(channel)
                                }
                            }
                        } else {
                            channelPlaceholder(channel)
                        }
                    }
                    .background(DesignTokens.Glass.bgStrong)
                    .clipped()

                // Metadata bar
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(channel.name ?? "Channel")
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let show = channel.currentShow {
                        Text(show)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(TVDesignTokens.Spacing.md)
                .background {
                    LinearGradient(
                        colors: [Color.clear, Color.black.opacity(0.85)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }

                // LIVE badge
                VStack {
                    HStack {
                        Spacer()
                        Text("LIVE")
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, TVDesignTokens.Spacing.xxs)
                            .background(DesignTokens.live.opacity(0.9))
                            .clipShape(Capsule())
                            .padding(TVDesignTokens.Spacing.sm)
                    }
                    Spacer()
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
        .buttonStyle(TVChannelCardButtonStyle())
        .frame(width: 300)
    }

    private func channelPlaceholder(_ channel: LiveChannelItem) -> some View {
        ZStack {
            LinearGradient(
                colors: [
                    DesignTokens.Primary.p400.opacity(0.3),
                    DesignTokens.Glass.purpleStrong,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "tv")
                    .font(.system(size: 56, weight: .light))
                    .foregroundStyle(DesignTokens.Text.secondary.opacity(0.6))

                Text(channel.name ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary.opacity(0.7))
                    .lineLimit(1)
            }
        }
    }

    private func tvLiveChannelsShelf(_ channels: [LiveChannelItem]) -> some View {
        let displayChannels = Array(channels.prefix(Self.maxItemsPerRow))

        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            // Header - matches GlassContentShelf style
            HStack {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "dot.radiowaves.left.and.right")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundColor(DesignTokens.Primary.p500)

                    Text("Live TV")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                }

                Spacer()

                Button { coordinator.selectedTab = .liveTV } label: {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Text("Show All")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        Image(systemName: "chevron.right")
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(
                        Capsule().fill(Color.white.opacity(0.06))
                    )
                    .overlay(
                        Capsule().stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                }
                .buttonStyle(.card)
                .tvFocusStyle(
                    scale: 1.04,
                    shadowRadius: TVDesignTokens.Focus.shadowRadius / 2
                )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            // Fixed row of channel cards
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(displayChannels) { channel in
                    tvChannelCard(channel)
                        .tvFocusStyle()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .focusSection()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
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

// MARK: - Channel Card Button Style

private struct TVChannelCardButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(
                isFocused
                    ? TVDesignTokens.Focus.scaleAmount
                    : (configuration.isPressed ? 0.97 : 1.0)
            )
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.5)
                    : Color.clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: isFocused ? 8 : 0
            )
            .animation(
                .spring(
                    duration: TVDesignTokens.Focus.animationDuration,
                    bounce: 0.2
                ),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
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
