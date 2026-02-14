import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// VOD screen showing a paginated grid of movies and series
struct VODView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: VODViewModel?
    @State private var featuredCollection: CollectionDetail?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "film.fill", title: "VOD")

            if let vm = viewModel {
                contentTypeFilters(vm)

                if !vm.categories.isEmpty {
                    categoryFilters(vm)
                }

                if let collection = featuredCollection, vm.selectedType == .all {
                    CollectionPromoBannerView(
                        collectionId: collection.id,
                        title: collection.title ?? "Collection",
                        posterUrl: collection.thumbnail,
                        promoText: collection.localizedPromoText ?? "Discover this amazing collection",
                        movieCount: collection.availableMovies ?? 0
                    )
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.vertical, DesignTokens.Spacing.sm)
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
            await loadFeaturedCollection()
        }
    }

    private func loadFeaturedCollection() async {
        do {
            let collections = try await repos.content.fetchCollections(skip: 0, limit: 1)
            if let first = collections.first {
                featuredCollection = try await repos.content.fetchCollectionDetail(id: first.id)
            }
        } catch {
            // Silently fail - banner is optional
        }
    }

    private func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(VODFilterType.allCases) { type in
                    FilterPill(
                        title: type.displayName,
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
        if item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
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
            Image(systemName: item.isSeries == true ? "tv" : "film")
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
        if item.isSeries == true {
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
        let badgeText: String
        if let available = item.availableMovies, let total = item.totalMovies, total > available {
            badgeText = "\(available) of \(total) movies"
        } else if let available = item.availableMovies {
            badgeText = "\(available) movies"
        } else {
            badgeText = "Collection"
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
