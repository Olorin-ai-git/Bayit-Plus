import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Youngsters content screen with trending, news, and category browsing
struct YoungtersView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: YoungstersViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = YoungstersViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func contentSections(_ vm: YoungstersViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if let featured = vm.featured, let hero = featured.hero {
                GlassContentCard(
                    thumbnailURL: hero.thumbnail,
                    title: hero.title,
                    subtitle: hero.category,
                    aspectRatio: 21 / 9,
                    width: .infinity,
                    onTap: {
                        coordinator.pushToCurrentTab(.movieDetail(movieId: hero.id))
                    }
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            if !vm.trending.isEmpty {
                trendingSection(vm)
            }

            if !vm.categories.isEmpty {
                categoryChips(vm)
            }

            if !vm.items.isEmpty {
                contentGrid(vm)
            }

            if !vm.news.isEmpty {
                newsSection(vm)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func trendingSection(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("youngsters.trending"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.trending) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            subtitle: item.duration,
                            onTap: {
                                coordinator.pushToCurrentTab(
                                    .movieDetail(movieId: item.id)
                                )
                            }
                        )
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func categoryChips(_ vm: YoungstersViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.categories) { cat in
                    GlassChip(
                        title: cat.name ?? "",
                        isSelected: vm.selectedCategory == cat.id
                    ) {
                        let newCat = vm.selectedCategory == cat.id ? nil : cat.id
                        Task { await vm.loadContent(category: newCat) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func contentGrid(_ vm: YoungstersViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    width: .infinity,
                    onTap: {
                        coordinator.pushToCurrentTab(.movieDetail(movieId: item.id))
                    }
                )
            }

            if vm.items.count < vm.total {
                Color.clear
                    .frame(height: 1)
                    .onAppear { Task { await vm.loadMore() } }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 160)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                ForEach(0 ..< 4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .fill(DesignTokens.Glass.bg)
                        .aspectRatio(16 / 9, contentMode: .fit)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
