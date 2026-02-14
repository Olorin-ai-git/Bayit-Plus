import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Favorites screen displaying favorited content in a grid shelf.
/// Reuses FavoritesViewModel from shared ViewModels.
struct TVFavoritesView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: FavoritesViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.items.isEmpty {
                    tvErrorState(error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    contentShelf(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = FavoritesViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func contentShelf(_ vm: FavoritesViewModel) -> some View {
        GlassContentShelf(title: "Favorites", items: vm.items) { item in
            GlassFocusPoster(
                thumbnailURL: item.thumbnail,
                title: item.title ?? "Content",
                subtitle: item.type?.capitalized,
                aspectRatio: 16 / 9
            )
        }
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "heart")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("tvos.favorites.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("tvos.favorites.emptyHint"))
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
            Text(localization.t("tvos.favorites.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
