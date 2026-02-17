import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS VOD screen with content poster grid.
/// Reuses VODViewModel from shared ViewModels.
struct TVVODView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: VODViewModel?
    @State private var featuredCollection: CollectionDetail?

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

                        if let collection = featuredCollection, vm.selectedType == .all {
                            TVCollectionPromoBannerView(
                                collectionId: collection.id,
                                title: collection.localizedTitle(for: localization.currentLanguage.rawValue) ?? localization.t("home.collection"),
                                posterUrl: collection.thumbnail,
                                promoText: collection.localizedPromoText(for: localization.currentLanguage.rawValue) ?? localization.t("home.discoverCollection"),
                                movieCount: collection.availableMovies ?? 0
                            )
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
            .task {
                if viewModel == nil {
                    viewModel = VODViewModel(repository: repos.content)
                }
                await viewModel?.loadContent()
                await loadFeaturedCollection()
            }
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
                            if item.isCollectionParent == true {
                                coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
                            } else if item.isSeries == true {
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
                           !languages.isEmpty {
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
            ForEach(0..<10, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private func vodSubtitle(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func badgeText(for item: ContentItem) -> String? {
        let movies = localization.t("vod.collection.movies")
        let of = localization.t("vod.collection.of")
        if item.isCollectionParent == true {
            if let available = item.availableMovies, let total = item.totalMovies, total > available {
                return "\(available) \(of) \(total) \(movies)"
            } else if let available = item.availableMovies {
                return "\(available) \(movies)"
            }
            return localization.t("home.collection")
        } else if item.isSeries == true {
            return localization.t("vod.series")
        }
        return nil
    }
}

/// tvOS filter pill with focus support
private struct TVFilterPill: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: isSelected ? .bold : .medium
                ))
                .foregroundColor(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                )
                .clipShape(Capsule())
                .scaleEffect(isFocused ? 1.05 : 1.0)
                .shadow(
                    color: isFocused ? DesignTokens.Primary.default.opacity(0.5) : .clear,
                    radius: isFocused ? 8 : 0
                )
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }
}
