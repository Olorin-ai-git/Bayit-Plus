import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Favorites screen displaying a grid of favorited content
struct FavoritesView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: FavoritesViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    contentGrid(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = FavoritesViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func contentGrid(_ vm: FavoritesViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.type?.capitalized,
                    width: .infinity
                ) {
                    if let contentId = item.contentId {
                        coordinator.pushToCurrentTab(
                            .movieDetail(movieId: contentId)
                        )
                    }
                }
                .contextMenu {
                    Button(role: .destructive) {
                        Task {
                            await vm.removeFavorite(
                                contentId: item.contentId ?? item.id
                            )
                        }
                    } label: {
                        Label(
                            localization.t("favorites.remove"),
                            systemImage: "heart.slash"
                        )
                    }
                }
            }

            if vm.items.count < vm.total {
                Color.clear
                    .frame(height: 1)
                    .onAppear {
                        Task { await vm.loadMore() }
                    }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "heart")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("favorites.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(16/9, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
