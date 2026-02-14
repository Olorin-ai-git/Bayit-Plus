import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Culture screen displaying Jerusalem and Tel Aviv content shelves.
/// Reuses CultureContentViewModel from shared ViewModels.
struct TVCultureView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: CultureContentViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.jerusalemItems.isEmpty && vm.telAvivItems.isEmpty {
                    loadingState
                } else if let error = vm.error,
                          vm.jerusalemItems.isEmpty && vm.telAvivItems.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = CultureContentViewModel(repository: repos.culture)
            }
            await viewModel?.load()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: CultureContentViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            if !vm.jerusalemItems.isEmpty {
                cultureShelf(title: "Jerusalem", items: vm.jerusalemItems)
            }

            if !vm.telAvivItems.isEmpty {
                cultureShelf(title: "Tel Aviv", items: vm.telAvivItems)
            }
        }
    }

    private func categoryFilters(_ vm: CultureContentViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                categoryChip("All", isSelected: vm.selectedCategory == nil) {
                    Task { await vm.filterByCategory(nil) }
                }

                ForEach(vm.categories) { cat in
                    categoryChip(cat.name ?? cat.id, isSelected: vm.selectedCategory == cat.id) {
                        Task { await vm.filterByCategory(cat.id) }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
    }

    private func categoryChip(
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

    private func cultureShelf(title: String, items: [CultureItem]) -> some View {
        GlassContentShelf(title: title, items: items) { item in
            GlassFocusPoster(
                thumbnailURL: nil,
                title: item.title ?? "Content",
                subtitle: item.sourceName,
                aspectRatio: 16 / 9
            )
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("cultures.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
