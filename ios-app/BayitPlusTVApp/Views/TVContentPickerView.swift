#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS full-screen content picker for selecting content when creating a personal widget.
    /// Displays 4 browsable tabs with a focus-navigable grid of thumbnails.
    struct TVContentPickerView: View {
        @Environment(LocalizationManager.self) private var localization

        @Bindable var viewModel: ContentPickerViewModel
        let onSelect: (ContentPickerItem) -> Void
        let onDismiss: () -> Void

        private let columns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        var body: some View {
            VStack(spacing: 0) {
                header
                tabBar
                searchBar
                contentArea
            }
            .background(DesignTokens.Background.primary)
        }

        // MARK: - Header

        private var header: some View {
            HStack {
                Text(localization.t("widgets.selectContent"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button { onDismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 48, height: 48)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(Circle())
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        // MARK: - Tab Bar

        private var tabBar: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(ContentPickerTab.allCases, id: \.self) { tab in
                        GlassChip(
                            title: tab.displayLabel,
                            isSelected: viewModel.selectedTab == tab
                        ) {
                            viewModel.selectedTab = tab
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .focusSection()
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }

        // MARK: - Search

        private var searchBar: some View {
            GlassSearchBar(
                text: $viewModel.searchQuery,
                placeholder: "Search \(viewModel.selectedTab.displayLabel.lowercased())..."
            )
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.bottom, TVDesignTokens.Spacing.md)
        }

        // MARK: - Content

        @ViewBuilder
        private var contentArea: some View {
            if viewModel.isLoading && viewModel.filteredItems.isEmpty {
                loadingGrid
            } else if let error = viewModel.error, viewModel.filteredItems.isEmpty {
                tvErrorState(error) {
                    Task { await viewModel.loadAll() }
                }
            } else if viewModel.filteredItems.isEmpty {
                emptyState
            } else {
                itemGrid
            }
        }

        private var itemGrid: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(viewModel.filteredItems) { item in
                        TVContentPickerCard(item: item) {
                            onSelect(item)
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.bottom, TVDesignTokens.Spacing.xxxl)
            }
        }

        // MARK: - States

        private var loadingGrid: some View {
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(0 ..< 8, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .fill(DesignTokens.Glass.bg)
                        .aspectRatio(1, contentMode: .fit)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.disabled)

                Text(localization.t("widgets.noContentFound"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 300)
        }
    }

#endif
