import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS VOD screen: filter pills, split hero (collection + actor),
/// paginated poster grid with staggered appearance animation.
struct TVVODView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: VODViewModel?
    @State var featuredCollections: [CollectionDetail] = []
    @State var actorRecommendations: [ActorListItem] = []
    @State var selectedActorName: String?
    @State private var visibleItemIDs: Set<String> = []

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let vm = viewModel {
                        contentTypeFilters(vm)
                        if vm.selectedType == .all { heroSection }
                        if vm.isLoading && vm.items.isEmpty {
                            loadingGrid
                        } else if let error = vm.error, vm.items.isEmpty {
                            tvErrorState(error) {
                                Task { await vm.refresh() }
                            }
                        } else {
                            contentGrid(vm.items, isLoadingMore: vm.isLoadingMore)
                        }
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .navigationDestination(item: $selectedActorName) { actorName in
                TVActorDetailView(actorName: actorName)
            }
            .task {
                if viewModel == nil {
                    viewModel = VODViewModel(
                        repository: repos.content,
                        actorRepository: repos.actor
                    )
                }
                await viewModel?.loadContent()
                await loadFeaturedCollections()
                await loadActorRecommendations()
            }
        }
    }

    private func loadFeaturedCollections() async {
        do {
            featuredCollections = try await repos.content
                .fetchCollectionRecommendations()
        } catch {}
    }

    private func loadActorRecommendations() async {
        do {
            actorRecommendations = try await repos.actor
                .fetchActorRecommendations(limit: 10)
        } catch {}
    }

    // MARK: - Filter Pills

    private func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(VODFilterType.allCases) { type in
                    TVFilterPill(
                        title: localization.t(type.localizationKey),
                        isSelected: vm.selectedType == type
                    ) {
                        vm.selectedType = type
                        visibleItemIDs.removeAll()
                        Task { await vm.loadContent() }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
    }

    // MARK: - Content Grid with staggered animation

    private func contentGrid(
        _ items: [ContentItem],
        isLoadingMore: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("tvos.vod.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    vodPosterCard(item, index: index, allItems: items)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.md)
    }

    private func vodPosterCard(
        _ item: ContentItem,
        index: Int,
        allItems: [ContentItem]
    ) -> some View {
        let isVisible = visibleItemIDs.contains(item.id)
        return GlassFocusPoster(
            thumbnailURL: item.thumbnail,
            title: item.title ?? "",
            subtitle: vodSubtitle(for: item),
            badge: badgeText(for: item),
            aspectRatio: 2 / 3,
            onSelect: { navigateToItem(item) }
        )
        .overlay(alignment: .bottomLeading) {
            if let langs = item.availableSubtitleLanguages, !langs.isEmpty {
                SubtitleFlagsPill(languages: langs, aiLanguages: [], size: .medium)
                    .padding(TVDesignTokens.Spacing.sm)
            }
        }
        .opacity(isVisible ? 1 : 0)
        .offset(y: isVisible ? 0 : 30)
        .onAppear {
            let staggerDelay = Double(index % 5) * 0.08
            withAnimation(.easeOut(duration: 0.4).delay(staggerDelay)) {
                visibleItemIDs.insert(item.id)
            }
            if item.id == allItems.last?.id {
                Task { await viewModel?.loadMore() }
            }
        }
    }

    func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "actor" {
            selectedActorName = item.id
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        } else if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else {
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0 ..< 10, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }
}
