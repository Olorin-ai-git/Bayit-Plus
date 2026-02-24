import BayitDesignSystem
import SwiftUI

/// Audiobooks listing screen with search, sort, autocomplete, and grid of audiobook cards
struct AudiobooksView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: AudiobooksViewModel?
    @State private var showSortSheet = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentView(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = AudiobooksViewModel(repository: repos.audiobook)
            }
            await viewModel?.loadInitial()
        }
        .sheet(isPresented: $showSortSheet) {
            if let vm = viewModel {
                AudiobookSortSheet(
                    selectedSort: Binding(
                        get: { vm.sortOption },
                        set: { vm.sortOption = $0 }
                    ),
                    onDismiss: { showSortSheet = false }
                )
            }
        }
    }

    // MARK: - Content

    private func contentView(_ vm: AudiobooksViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            searchAndSortBar(vm)
            autocompleteOverlay(vm)
            browseByAuthorButton
            audiobookGrid(vm)
        }
    }

    // MARK: - Search & Sort Bar

    private func searchAndSortBar(_ vm: AudiobooksViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            GlassSearchBar(
                text: Binding(
                    get: { vm.searchQuery },
                    set: { vm.searchQuery = $0 }
                ),
                placeholder: "Search audiobooks..."
            )
            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                showSortSheet = true
            } label: {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundColor(
                        vm.sortOption == .featured
                            ? DesignTokens.Text.secondary
                            : DesignTokens.Primary.default
                    )
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Sort audiobooks")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Autocomplete

    private func autocompleteOverlay(_ vm: AudiobooksViewModel) -> some View {
        Group {
            if !vm.autocompleteSuggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(vm.autocompleteSuggestions, id: \.self) { suggestion in
                        Button {
                            vm.searchQuery = suggestion
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        } label: {
                            HStack(spacing: DesignTokens.Spacing.sm) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundColor(DesignTokens.Text.muted)
                                Text(suggestion)
                                    .font(.system(size: DesignTokens.FontSize.md))
                                    .foregroundColor(DesignTokens.Text.primary)
                                    .lineLimit(1)
                                Spacer()
                            }
                            .padding(.horizontal, DesignTokens.Spacing.lg)
                            .padding(.vertical, DesignTokens.Spacing.sm)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: vm.autocompleteSuggestions.isEmpty)
    }

    // MARK: - Browse by Author

    private var browseByAuthorButton: some View {
        Button {
            coordinator.navigate(to: .audiobookCollections)
        } label: {
            HStack {
                Image(systemName: "person.2.fill")
                    .font(.system(size: DesignTokens.FontSize.md))
                Text("Browse by Author")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
            }
            .foregroundColor(DesignTokens.Text.primary)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Grid

    private func audiobookGrid(_ vm: AudiobooksViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.filteredItems) { audiobook in
                AudiobookCardView(audiobook: audiobook) {
                    coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Loading

    private var loadingState: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
