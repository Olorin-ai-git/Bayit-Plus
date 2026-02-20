import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// VOD screen showing a paginated grid of movies and series
struct VODView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: VODViewModel?
    @State private var continueWatchingItems: [WatchHistoryItem] = []
    @State private var trendingRecommendations: [TrendingContentRecommendation] = []
    @State private var aiCollectionRecommendations: [CollectionDetail] = []

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "film.fill", title: "VOD")

            if let vm = viewModel {
                // Continue Watching row (only on "All" filter when user has progress)
                if !continueWatchingItems.isEmpty && vm.selectedType == .all {
                    ContinueWatchingSection(items: continueWatchingItems) { item in
                        coordinator.navigate(to: .player(
                            contentId: item.id,
                            contentType: ContentType(rawValue: item.type ?? "movie") ?? .movie
                        ))
                    }
                }

                contentTypeFilters(vm)

                if !vm.availableGenres.isEmpty {
                    genreFilters(vm)
                }

                if !aiCollectionRecommendations.isEmpty && vm.selectedType == .all {
                    FeaturedCollectionsCarousel(collections: aiCollectionRecommendations)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                }

                if !trendingRecommendations.isEmpty && vm.selectedType == .all {
                    trendingSection
                }

                if !aiCollectionRecommendations.isEmpty && vm.selectedType == .all {
                    aiCollectionsSection
                }

                if vm.isLoading && vm.items.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    vodGrid(vm.items, isLoadingMore: vm.isLoadingMore)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = VODViewModel(repository: repos.content)
            }
            await viewModel?.loadContent()
            async let continueWatchingTask: Void = loadContinueWatching()
            async let trendingTask: Void = loadTrendingRecommendations()
            async let aiCollectionsTask: Void = loadAICollectionRecommendations()
            _ = await (continueWatchingTask, trendingTask, aiCollectionsTask)
        }
        .onChange(of: coordinator.fullscreenRoute == nil) { _, isDismissed in
            if isDismissed {
                Task { await loadContinueWatching() }
            }
        }
    }

    private func loadContinueWatching() async {
        do {
            let response = try await repos.content.fetchContinueWatching()
            continueWatchingItems = response.items
        } catch {
            // Silently fail - continue watching is optional
        }
    }

    private func loadTrendingRecommendations() async {
        do {
            let response = try await repos.content.fetchTrendingRecommendations(limit: 10)
            trendingRecommendations = response.recommendations
        } catch {
            // Silently fail - trending is optional
        }
    }

    private func loadAICollectionRecommendations() async {
        do {
            aiCollectionRecommendations = try await repos.content.fetchCollectionRecommendations()
        } catch {
            // Silently fail - AI collections are optional
        }
    }

    private var trendingSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text(localization.t("vod.trending"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(trendingRecommendations) { item in
                        TrendingContentCard(item: item) {
                            coordinator.navigate(to: .movieDetail(movieId: item.id))
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private var aiCollectionsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundColor(DesignTokens.Primary.default)
                Text(localization.t("vod.aiCollections"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(aiCollectionRecommendations) { collection in
                        AICollectionCard(collection: collection) {
                            coordinator.navigate(to: .collectionDetail(collectionId: collection.id))
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(VODFilterType.allCases) { type in
                    FilterPill(
                        title: localization.t(type.localizationKey),
                        isSelected: vm.selectedType == type
                    ) {
                        vm.selectedType = type
                        Task { await vm.loadContent() }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private func categoryFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                FilterPill(
                    title: localization.t("vod.allCategories"),
                    isSelected: vm.selectedCategory == nil
                ) {
                    vm.selectedCategory = nil
                    vm.applyFilters()
                }

                ForEach(vm.categories) { category in
                    FilterPill(
                        title: category.name,
                        isSelected: vm.selectedCategory == category.id
                    ) {
                        vm.selectedCategory = category.id
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private func genreFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                FilterPill(
                    title: localization.t("vod.allGenres"),
                    isSelected: vm.selectedGenre == nil
                ) {
                    vm.selectedGenre = nil
                    vm.applyFilters()
                }

                ForEach(vm.availableGenres, id: \.self) { genre in
                    FilterPill(
                        title: genre,
                        isSelected: vm.selectedGenre == genre
                    ) {
                        vm.selectedGenre = genre
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func vodGrid(
        _ items: [ContentItem],
        isLoadingMore: Bool
    ) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(items) { item in
                VODCard(item: item) {
                    navigateToItem(item)
                }
                .onAppear {
                    if item.id == items.last?.id {
                        Task { await viewModel?.loadMore() }
                    }
                }
            }

            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<9, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "collection" || item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}

/// Individual VOD content card with poster, title, and metadata
private struct VODCard: View {
    let item: ContentItem
    let onTap: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    )
                    .overlay(alignment: .bottomTrailing) {
                        subtitlePill
                    }
                    .overlay(alignment: .bottomLeading) {
                        if item.isCollectionParent == true {
                            collectionBadge
                        } else {
                            seriesBadge
                        }
                    }
                    .overlay(alignment: .topLeading) {
                        contentRatingBadge
                    }
                    .overlay(alignment: .topTrailing) {
                        hebrewDubBadge
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title ?? "Untitled")
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(.top, DesignTokens.Spacing.xs)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    posterPlaceholder
                }
            }
        } else {
            posterPlaceholder
        }
    }

    private var posterPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: item.type?.lowercased() == "series" ? "tv" : "film")
                .font(.system(size: 28))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    @ViewBuilder
    private var subtitlePill: some View {
        if let langs = item.availableSubtitleLanguages, !langs.isEmpty {
            SubtitleFlagsPill(
                languages: langs,
                aiLanguages: aiLanguages,
                size: .small
            )
            .padding(DesignTokens.Spacing.xs)
        }
    }

    @ViewBuilder
    private var seriesBadge: some View {
        if item.type?.lowercased() == "series" {
            Text(localization.t("vod.series"))
                .font(.system(
                    size: DesignTokens.FontSize.xs,
                    weight: .semibold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, 3)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    private var collectionBadge: some View {
        let movies = localization.t("vod.collection.movies")
        let of = localization.t("vod.collection.of")
        let badgeText: String
        if let available = item.availableMovies, let total = item.totalMovies, total > available {
            badgeText = "\(available) \(of) \(total) \(movies)"
        } else if let available = item.availableMovies {
            badgeText = "\(available) \(movies)"
        } else {
            badgeText = localization.t("home.collection")
        }

        return Text(badgeText)
            .font(.system(
                size: DesignTokens.FontSize.xs,
                weight: .semibold
            ))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
            .padding(DesignTokens.Spacing.xs)
    }

    @ViewBuilder
    private var contentRatingBadge: some View {
        if let rating = item.contentRating, !rating.isEmpty {
            Text(rating)
                .font(.system(
                    size: DesignTokens.FontSize.xs - 1,
                    weight: .bold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(Color.black.opacity(0.7))
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    @ViewBuilder
    private var hebrewDubBadge: some View {
        if item.hasHebrewDub {
            Text(localization.t("vod.hebrewDub"))
                .font(.system(
                    size: DesignTokens.FontSize.xs - 1,
                    weight: .semibold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(DesignTokens.Primary.default.opacity(0.85))
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                )
                .padding(DesignTokens.Spacing.xs)
        }
    }

    private var subtitle: String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private var aiLanguages: Set<String> {
        var langs = Set<String>()
        if item.availableSubtitleLanguages?.contains("he") == true {
            langs.insert("he")
        }
        if item.availableSubtitleLanguages?.contains("en") == true {
            langs.insert("en")
        }
        return langs
    }
}

/// Filter pill button component
private struct FilterPill: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(
                    size: DesignTokens.FontSize.sm,
                    weight: isSelected ? .semibold : .medium
                ))
                .foregroundColor(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(
                    isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

/// Card for trending content recommendations
private struct TrendingContentCard: View {
    let item: TrendingContentRecommendation
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .topLeading) {
                        if let topic = item.trendingTopic {
                            Text(topic)
                                .font(.system(
                                    size: DesignTokens.FontSize.xs - 1,
                                    weight: .semibold
                                ))
                                .foregroundColor(.white)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.85))
                                .clipShape(
                                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                )
                                .padding(DesignTokens.Spacing.xs)
                        }
                    }

                Text(item.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .padding(.top, DesignTokens.Spacing.xs)
            }
            .frame(width: 120)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    ZStack {
                        DesignTokens.Glass.bgMedium
                        Image(systemName: "film")
                            .font(.system(size: 24))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }
            }
        } else {
            ZStack {
                DesignTokens.Glass.bgMedium
                Image(systemName: "film")
                    .font(.system(size: 24))
                    .foregroundColor(DesignTokens.Text.muted)
            }
        }
    }
}

/// Card for AI-recommended collections
private struct AICollectionCard: View {
    @Environment(LocalizationManager.self) private var localization
    let collection: CollectionDetail
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                posterImage
                    .frame(width: 160, height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .topLeading) {
                        HStack(spacing: 2) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 8))
                            Text("AI")
                                .font(.system(
                                    size: DesignTokens.FontSize.xs - 1,
                                    weight: .bold
                                ))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Primary.default.opacity(0.85))
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        )
                        .padding(DesignTokens.Spacing.xs)
                    }

                Text(collection.localizedTitle(
                    for: localization.currentLanguage.rawValue
                ) ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)

                if let movies = collection.availableMovies {
                    Text("\(movies) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }
            .frame(width: 160)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = collection.thumbnail ?? collection.backdrop,
           let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    DesignTokens.Glass.bgMedium
                }
            }
        } else {
            DesignTokens.Glass.bgMedium
        }
    }
}
