#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet-based content picker for selecting content when creating a personal widget.
/// Displays 4 browsable tabs (Channels, Podcasts, Radio, Audiobooks) with thumbnails
/// and client-side search.
struct ContentPickerView: View {

    @Bindable var viewModel: ContentPickerViewModel
    let onSelect: (ContentPickerItem) -> Void
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                tabBar
                searchBar
                contentArea
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("widgets.selectContent"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { onDismiss() }
                }
            }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(ContentPickerTab.allCases, id: \.self) { tab in
                    GlassChip(
                        title: tab.displayLabel,
                        isSelected: viewModel.selectedTab == tab
                    ) {
                        viewModel.selectedTab = tab
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    // MARK: - Search

    private var searchBar: some View {
        GlassSearchBar(
            text: $viewModel.searchQuery,
            placeholder: "Search \(viewModel.selectedTab.displayLabel.lowercased())..."
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    // MARK: - Content

    @ViewBuilder
    private var contentArea: some View {
        if viewModel.isLoading && viewModel.filteredItems.isEmpty {
            loadingGrid
        } else if let error = viewModel.error, viewModel.filteredItems.isEmpty {
            errorState(error)
        } else if viewModel.filteredItems.isEmpty {
            emptyState
        } else {
            itemGrid
        }
    }

    private var itemGrid: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                ForEach(viewModel.filteredItems) { item in
                    Button { onSelect(item) } label: {
                        contentCard(item)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xxxl)
        }
    }

    private func contentCard(_ item: ContentPickerItem) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            thumbnailView(item.thumbnailURL, iconName: item.tab.iconName)
                .frame(height: 100)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

            Text(item.title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            if let subtitle = item.subtitle {
                Text(subtitle)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    private func thumbnailView(_ url: URL?, iconName: String) -> some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        placeholderIcon(iconName)
                    }
                }
            } else {
                placeholderIcon(iconName)
            }
        }
    }

    private func placeholderIcon(_ iconName: String) -> some View {
        ZStack {
            DesignTokens.Glass.bg
            Image(systemName: iconName)
                .font(.system(size: 28))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - States

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 140)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Text.disabled)

            Text("No \(viewModel.selectedTab.displayLabel.lowercased()) found")
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xxxl)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)

            GlassButton("Retry", variant: .secondary, size: .small) {
                Task { await viewModel.loadAll() }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xxxl)
    }
}
#endif
