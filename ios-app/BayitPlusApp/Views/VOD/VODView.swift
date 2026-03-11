import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// VOD screen showing a paginated grid of movies and series
struct VODView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: VODViewModel?
    @State private var continueWatchingItems: [WatchHistoryItem] = []
    @State var trendingRecommendations: [TrendingContentRecommendation] = []
    @State var aiCollectionRecommendations: [CollectionDetail] = []
    @State var actorRecommendations: [ActorListItem] = []
    @State private var hasLoaded = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "film.fill", title: localization.t("vod.title"))

            if let vm = viewModel {
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

                if !actorRecommendations.isEmpty && vm.selectedType == .all {
                    FeaturedActorsCarousel(actors: actorRecommendations)
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
            guard !hasLoaded else { return }
            hasLoaded = true

            if viewModel == nil {
                viewModel = VODViewModel(
                    repository: repos.content,
                    actorRepository: repos.actor
                )
            }
            await viewModel?.loadContent()
            async let continueWatchingTask: Void = loadContinueWatching()
            async let trendingTask: Void = loadTrendingRecommendations()
            async let aiCollectionsTask: Void = loadAICollectionRecommendations()
            async let actorRecsTask: Void = loadActorRecommendations()
            _ = await (continueWatchingTask, trendingTask, aiCollectionsTask, actorRecsTask)
        }
        .onChange(of: coordinator.fullscreenRoute == nil) { _, isDismissed in
            if isDismissed {
                Task { await loadContinueWatching() }
            }
        }
    }

    // MARK: - Data Loading

    private func loadContinueWatching() async {
        do {
            let response = try await repos.media.fetchContinueWatching()
            continueWatchingItems = response.items
        } catch {
            // Silently fail - continue watching is optional
        }
    }

    private func loadTrendingRecommendations() async {
        do {
            let response = try await repos.trendingRepo.fetchTrendingRecommendations(limit: 10)
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

    // MARK: - Grid Views

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

    private static let loadingIndices = Array(0 ..< 9)

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(Self.loadingIndices, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    // MARK: - Navigation

    private func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "actor" {
            coordinator.navigate(to: .actorDetail(actorName: item.id))
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }

    private func loadActorRecommendations() async {
        do {
            actorRecommendations = try await repos.actor.fetchActorRecommendations(limit: 10)
        } catch {
            // Silently fail - actor recommendations are optional
        }
    }
}
