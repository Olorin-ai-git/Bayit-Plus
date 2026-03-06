import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Watchlist screen displaying the user's saved playlist items in a 5-column grid.
/// Shares PlaylistViewModel with the iOS app; repository is repos.user.
struct TVWatchlistView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PlaylistViewModel?
    @State private var filter: WatchlistFilter = .all
    @State private var itemToRemove: String?

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        count: 5
    )

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                TVPageHeader(
                    icon: "list.bullet.clipboard",
                    title: localization.t("playlist.title")
                )
                filterChipsRow
                if let vm = viewModel {
                    if vm.isLoading && vm.items.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.items.isEmpty {
                        tvErrorState(error) { Task { await viewModel?.load() } }
                    } else if filteredItems(vm).isEmpty {
                        emptyState
                    } else {
                        playlistGrid(filteredItems(vm))
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = PlaylistViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
        .confirmationDialog(
            localization.t("playlist.removeItem"),
            isPresented: Binding(
                get: { itemToRemove != nil },
                set: { if !$0 { itemToRemove = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button(localization.t("common.delete"), role: .destructive) {
                guard let id = itemToRemove else { return }
                itemToRemove = nil
                Task { await viewModel?.removeItem(contentId: id) }
            }
        }
    }

    // MARK: - Filter Row

    private var filterChipsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(WatchlistFilter.allCases) { f in
                    Button { filter = f } label: {
                        Text(localization.t(f.localizationKey))
                            .font(.system(
                                size: TVDesignTokens.FontSize.lg,
                                weight: filter == f ? .bold : .medium
                            ))
                            .foregroundColor(
                                filter == f ? DesignTokens.Text.primary : DesignTokens.Text.muted
                            )
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(
                                filter == f ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Grid

    private func playlistGrid(_ items: [PlaylistItem]) -> some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(items) { item in
                GlassFocusPoster(
                    thumbnailURL: item.thumbnail,
                    title: item.title ?? "Untitled",
                    subtitle: item.contentType?.capitalized,
                    aspectRatio: 2 / 3,
                    onSelect: {
                        let contentType = TVContentTypeMapper.map(item.contentType)
                        if contentType == .vod {
                            coordinator.fullscreenRoute = .movieDetail(movieId: item.contentId)
                        } else {
                            coordinator.presentPlayer(
                                contentId: item.contentId,
                                contentType: contentType
                            )
                        }
                    }
                )
                .contextMenu {
                    Button(role: .destructive) {
                        itemToRemove = item.contentId
                    } label: {
                        Label(localization.t("playlist.removeItem"), systemImage: "trash")
                    }
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Filtering

    private func filteredItems(_ vm: PlaylistViewModel) -> [PlaylistItem] {
        switch filter {
        case .all, .inProgress:
            return vm.items
        case .movies:
            return vm.items.filter {
                ($0.contentType ?? "").lowercased().contains("movie")
            }
        case .series:
            return vm.items.filter {
                ($0.contentType ?? "").lowercased().contains("series")
            }
        }
    }

    // MARK: - States

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "list.bullet.clipboard")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("playlist.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("playlist.emptyHint"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 600)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("playlist.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

// MARK: - Filter Type

private enum WatchlistFilter: String, CaseIterable, Identifiable {
    case all, inProgress, movies, series

    var id: String {
        rawValue
    }

    var localizationKey: String {
        switch self {
        case .all: return "playlist.filters.all"
        case .inProgress: return "playlist.filters.continue"
        case .movies: return "playlist.filters.movies"
        case .series: return "playlist.filters.series"
        }
    }
}
