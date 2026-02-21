import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - VODView Filter Extensions

extension VODView {
    func contentTypeFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(VODFilterType.allCases) { type in
                    VODFilterPill(
                        title: localization.t(type.localizationKey),
                        isSelected: vm.selectedType == type
                    ) {
                        vm.selectedType = type
                        Task { await vm.loadContent() }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    func categoryFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                VODFilterPill(
                    title: localization.t("vod.allCategories"),
                    isSelected: vm.selectedCategory == nil
                ) {
                    vm.selectedCategory = nil
                    vm.applyFilters()
                }

                ForEach(vm.categories) { category in
                    VODFilterPill(
                        title: category.name,
                        isSelected: vm.selectedCategory == category.id
                    ) {
                        vm.selectedCategory = category.id
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    func genreFilters(_ vm: VODViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                VODFilterPill(
                    title: localization.t("vod.allGenres"),
                    isSelected: vm.selectedGenre == nil
                ) {
                    vm.selectedGenre = nil
                    vm.applyFilters()
                }

                ForEach(vm.availableGenres, id: \.self) { genre in
                    VODFilterPill(
                        title: genre,
                        isSelected: vm.selectedGenre == genre
                    ) {
                        vm.selectedGenre = genre
                        vm.applyFilters()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }
}

/// Filter pill button component used in VOD filter rows
struct VODFilterPill: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(
                    size: DesignTokens.FontSize.sm,
                    weight: isSelected ? .semibold : .medium
                ))
                .foregroundColor(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(
                    isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
