import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS VOD screen with content poster grid.
/// Reuses VODViewModel from shared ViewModels.
struct TVVODView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: VODViewModel?
    @State private var featuredCollections: [CollectionDetail] = []
    @State private var selectedActorName: String?

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

                        if !featuredCollections.isEmpty && vm.selectedType == .all {
                            TVFeaturedCollectionsCarousel(collections: featuredCollections)
                                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                                .padding(.vertical, TVDesignTokens.Spacing.lg)
                        }

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
            }
        }
    }

    private func loadFeaturedCollections() async {
        do {
            featuredCollections = try await repos.content.fetchCollectionRecommendations()
        } catch {
            // Silently fail - banner is optional
        }
    }

    private func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(VODFilterType.allCases) { type in
                    TVFilterPill(
                        title: localization.t(type.localizationKey),
                        isSelected: vm.selectedType == type
                    ) {
                        vm.selectedType = type
                        Task { await vm.loadContent() }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    private func contentGrid(
        _ items: [ContentItem],
        isLoadingMore: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("tvos.vod.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        subtitle: vodSubtitle(for: item),
                        badge: badgeText(for: item),
                        aspectRatio: 2 / 3,
                        onSelect: {
                            let ct = item.type?.lowercased() ?? ""
                            if ct == "actor" {
                                selectedActorName = item.id
                            } else if ct == "collection" || item.isCollectionParent == true {
                                coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
                            } else if ct == "series" {
                                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
                            } else {
                                coordinator.presentPlayer(
                                    contentId: item.id,
                                    contentType: TVContentTypeMapper.map(item.type)
                                )
                            }
                        }
                    )
                    .overlay(alignment: .bottomLeading) {
                        if let languages = item.availableSubtitleLanguages,
                           !languages.isEmpty
                        {
                            SubtitleFlagsPill(
                                languages: languages,
                                aiLanguages: [],
                                size: .medium
                            )
                            .padding(TVDesignTokens.Spacing.sm)
                        }
                    }
                    .onAppear {
                        if item.id == items.last?.id {
                            Task { await viewModel?.loadMore() }
                        }
                    }
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
        .padding(.top, TVDesignTokens.Spacing.lg)
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
