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
            .buttonStyle(.card)
            .tvFocusStyle()
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
            ForEach(0..<8, id: \.self) { _ in
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

// MARK: - Content Picker Card

private struct TVContentPickerCard: View {
    let item: ContentPickerItem
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                thumbnailView
                    .frame(width: 120, height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))

                Text(item.title)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }
        .buttonStyle(TVContentPickerCardStyle())
    }

    private var thumbnailView: some View {
        Group {
            if let url = item.thumbnailURL {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        placeholderIcon
                    }
                }
            } else {
                placeholderIcon
            }
        }
    }

    private var placeholderIcon: some View {
        ZStack {
            DesignTokens.Glass.purpleLight
            Image(systemName: item.tab.iconName)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}

private struct TVContentPickerCardStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Glass.purpleGlow.opacity(0.5) : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0, y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
    }
}
#endif
