import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Children content screen with age-group filtering and category shelves.
/// Reuses ChildrenViewModel from shared ViewModels.
struct TVChildrenView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ChildrenViewModel?
    @State private var selectedAgeGroupId: String?

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
                viewModel = ChildrenViewModel(repository: repos.category)
            }
            await viewModel?.load()
            await viewModel?.loadContent()
        }
    }

    private let gridColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    @ViewBuilder
    private func contentSections(_ vm: ChildrenViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if let featured = vm.featured, let hero = featured.hero {
                featuredHero(hero)
            }

            if !vm.categories.isEmpty {
                categoryGrid(vm)
            }

            if !vm.ageGroups.isEmpty {
                ageGroupFilters(vm)
            }

            if !vm.items.isEmpty {
                contentGrid(vm)
            }
        }
    }

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
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
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

    private func ageGroupFilters(_ vm: ChildrenViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(vm.ageGroups) { group in
                    filterChip(group.name ?? "", isSelected: selectedAgeGroupId == group.id) {
                        let newId = selectedAgeGroupId == group.id ? nil : group.id
                        selectedAgeGroupId = newId
                        Task {
                            await vm.loadContent(category: vm.selectedCategory, ageGroup: newId)
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
    }

    @State private var selectedCategoryId: String?

    private func categoryGrid(_ vm: ChildrenViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                filterChip(localization.t("common.all"), isSelected: selectedCategoryId == nil) {
                    selectedCategoryId = nil
                    Task { await vm.loadContent(category: nil, ageGroup: selectedAgeGroupId) }
                }

                ForEach(vm.categories) { cat in
                    filterChip(cat.name ?? "Category", isSelected: selectedCategoryId == cat.id) {
                        selectedCategoryId = cat.id
                        Task { await vm.loadContent(category: cat.id, ageGroup: selectedAgeGroupId) }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
        .focusSection()
    }

    private func contentGrid(_ vm: ChildrenViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("tvos.children.allContent"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: gridColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Content",
                        subtitle: item.duration,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: .vod
                            )
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
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func filterChip(
        _ title: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("tvos.children.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
