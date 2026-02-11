import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Youngsters content screen with categories, trending, and news.
///
/// Follows the TVChildrenView pattern but matches the actual
/// `YoungstersViewModel` API (no `ageGroups`; has `trending` and `news`).
struct TVYoungstersView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: YoungstersViewModel?

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

    @ViewBuilder
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
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
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

    private func categoryShelf(_ vm: YoungstersViewModel) -> some View {
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

    private let contentColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    private func contentShelf(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("youngsters.categories.all"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: contentColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? localization.t("youngsters.title"),
                        subtitle: item.duration,
                        aspectRatio: 16 / 9,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: TVContentTypeMapper.map(item.type)
                            )
                        }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func trendingShelf(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("youngsters.categories.trending"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: contentColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.trending) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? localization.t("youngsters.title"),
                        subtitle: item.duration,
                        badge: localization.t("youngsters.categories.trending"),
                        aspectRatio: 16 / 9,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: TVContentTypeMapper.map(item.type)
                            )
                        }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - News

    private func newsSection(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("youngsters.categories.news"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(vm.news.prefix(5)) { item in
                    newsCard(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func newsCard(_ item: NewsItem) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let source = item.source {
                        Text(source)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("youngsters.title"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
