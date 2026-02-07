import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Children content screen with age-group filtering and categories
struct ChildrenView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ChildrenViewModel?
    @State private var selectedAgeGroupId: String?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
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
                viewModel = ChildrenViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func contentSections(_ vm: ChildrenViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if let featured = vm.featured, let hero = featured.hero {
                featuredHero(hero)
            }

            if !vm.ageGroups.isEmpty {
                ageGroupFilter(vm)
            }

            if !vm.categories.isEmpty {
                categoryChips(vm)
            }

            if !vm.items.isEmpty {
                contentGrid(vm)
            } else if vm.categories.isEmpty == false {
                categoryGrid(vm)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func featuredHero(_ item: SectionContentItem) -> some View {
        GlassContentCard(
            thumbnailURL: item.thumbnail,
            title: item.title,
            subtitle: item.category,
            aspectRatio: 21/9,
            width: .infinity
        ) {
            coordinator.pushToCurrentTab(.movieDetail(movieId: item.id))
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func ageGroupFilter(_ vm: ChildrenViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.ageGroups) { group in
                    GlassChip(
                        title: group.name ?? "",
                        isSelected: selectedAgeGroupId == group.id
                    ) {
                        let newId = selectedAgeGroupId == group.id ? nil : group.id
                        selectedAgeGroupId = newId
                        Task {
                            await vm.loadContent(
                                category: vm.selectedCategory,
                                ageGroup: newId
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func categoryChips(_ vm: ChildrenViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.categories) { cat in
                    GlassChip(
                        title: cat.name ?? "",
                        isSelected: vm.selectedCategory == cat.id
                    ) {
                        let newCat = vm.selectedCategory == cat.id ? nil : cat.id
                        Task {
                            await vm.loadContent(
                                category: newCat,
                                ageGroup: selectedAgeGroupId
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func categoryGrid(_ vm: ChildrenViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.categories) { cat in
                GlassContentCard(
                    thumbnailURL: cat.thumbnail,
                    title: cat.name,
                    width: .infinity
                ) {
                    Task { await vm.loadContent(category: cat.id) }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func contentGrid(_ vm: ChildrenViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    width: .infinity
                ) {
                    coordinator.pushToCurrentTab(.movieDetail(movieId: item.id))
                }
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
                ForEach(0..<4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .fill(DesignTokens.Glass.bg)
                        .aspectRatio(16/9, contentMode: .fit)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
