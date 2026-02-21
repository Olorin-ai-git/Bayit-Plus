import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Youngsters content screen with categories, trending, and news.
///
/// Follows the TVChildrenView pattern but matches the actual
/// `YoungstersViewModel` API (no `ageGroups`; has `trending` and `news`).
struct TVYoungstersView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: YoungstersViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    tvErrorState(error) {
                        Task { await viewModel?.load() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = YoungstersViewModel(repository: repos.category)
            }
            await viewModel?.load()
            await viewModel?.loadContent()
        }
    }

    // MARK: - Content Sections

    private func contentSections(_ vm: YoungstersViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if let featured = vm.featured, let hero = featured.hero {
                featuredHero(hero)
            }

            if !vm.categories.isEmpty {
                categoryShelf(vm)
            }

            if !vm.items.isEmpty {
                contentShelf(vm)
            }

            if !vm.trending.isEmpty {
                trendingShelf(vm)
            }

            if !vm.news.isEmpty {
                newsSection(vm)
            }
        }
    }

    // MARK: - Featured Hero

    private func featuredHero(_ item: SectionContentItem) -> some View {
        ZStack(alignment: .bottomLeading) {
            if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
            } else {
                DesignTokens.Glass.purpleLight
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.title ?? "")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxxl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let category = item.category {
                    Text(category)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .background(
                LinearGradient(
                    colors: [Color.clear, DesignTokens.Glass.bgStrong],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .frame(height: TVDesignTokens.MinSize.heroHeight)
    }

    // MARK: - Shelves

    func categoryShelf(_ vm: YoungstersViewModel) -> some View {
        GlassContentShelf(
            title: localization.t("youngsters.categories.all"),
            items: vm.categories
        ) { cat in
            GlassFocusPoster(
                thumbnailURL: cat.thumbnail,
                title: cat.name ?? localization.t("youngsters.title"),
                aspectRatio: 16 / 9,
                onSelect: {
                    Task { await vm.loadContent(category: cat.id) }
                }
            )
        }
    }

    let contentColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

}
