import BayitDesignSystem
import SwiftUI

/// Full culture content screen with category filter tabs and city sections
struct CultureContentView: View {
    @Environment(RepositoryProvider.self) private var repos
    @State private var viewModel: CultureContentViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.jerusalemItems.isEmpty && vm.telAvivItems.isEmpty {
                    loadingState
                } else if let error = vm.error,
                          vm.jerusalemItems.isEmpty && vm.telAvivItems.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentView(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = CultureContentViewModel(repository: repos.culture)
            }
            await viewModel?.load()
        }
        .onDisappear {
            viewModel?.stopAutoRefresh()
        }
    }

    private func contentView(_ vm: CultureContentViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if !vm.categories.isEmpty {
                categoryFilterTabs(vm)
            }

            if !vm.jerusalemItems.isEmpty {
                JerusalemRowView(items: vm.jerusalemItems) { item in
                    openCultureItem(item)
                }
            }

            if !vm.telAvivItems.isEmpty {
                TelAvivRowView(items: vm.telAvivItems) { item in
                    openCultureItem(item)
                }
            }
        }
    }

    private func categoryFilterTabs(_ vm: CultureContentViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: "All",
                    isSelected: vm.selectedCategory == nil
                ) {
                    Task { await vm.filterByCategory(nil) }
                }

                ForEach(vm.categories) { category in
                    GlassChip(
                        title: category.nameHe ?? category.name ?? "",
                        isSelected: vm.selectedCategory == category.id
                    ) {
                        Task { await vm.filterByCategory(category.id) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func openCultureItem(_ item: CultureItem) {
        if let urlString = item.url, let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 120)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
