import BayitDesignSystem
import SwiftUI

/// Browse mode for the audiobooks tab
enum AudiobookBrowseMode: String, CaseIterable, Identifiable {
    case byTitle
    case byAuthor

    var id: String {
        rawValue
    }

    var label: String {
        switch self {
        case .byTitle: return "By Title"
        case .byAuthor: return "By Author"
        }
    }
}

/// Audiobooks content tab within the Listen screen - browse by title or by author
struct AudiobooksListenTab: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: AudiobooksViewModel?
    @State private var browseMode: AudiobookBrowseMode = .byTitle
    @State private var authors: [AudiobookAuthor] = []
    @State private var isLoadingAuthors = false
    @State private var authorError: String?
    @State private var showSortSheet = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: DesignTokens.Spacing.lg) {
                browseToggle
                if let vm = viewModel {
                    searchAndSortBar(vm)
                    autocompleteOverlay(vm)
                }
                browseContent
            }
        }
        .refreshable {
            switch browseMode {
            case .byTitle:
                await viewModel?.refresh()
            case .byAuthor:
                await loadAuthors()
            }
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
                    options: browseMode == .byTitle
                        ? AudiobookSortOption.titleOptions
                        : AudiobookSortOption.authorOptions,
                    onDismiss: { showSortSheet = false }
                )
            }
        }
    }

    // MARK: - Browse Toggle

    private var browseToggle: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(AudiobookBrowseMode.allCases) { mode in
                GlassChip(
                    title: mode.label,
                    isSelected: browseMode == mode
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        browseMode = mode
                        viewModel?.sortOption = mode == .byTitle
                            ? .featured : .authorAZ
                    }
                    if mode == .byAuthor && authors.isEmpty {
                        Task { await loadAuthors() }
                    }
                }
            }
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    // MARK: - Browse Content

    @ViewBuilder
    private var browseContent: some View {
        switch browseMode {
        case .byTitle:
            titleContent
        case .byAuthor:
            authorContent
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

    // MARK: - By Title

    @ViewBuilder
    private var titleContent: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.items.isEmpty {
                loadingGrid
            } else if let error = vm.error, vm.items.isEmpty {
                ErrorStateView(message: error) {
                    Task { await vm.refresh() }
                }
            } else {
                audiobookGrid(vm)
            }
        } else {
            ScreenLoadingView()
        }
    }

    private func audiobookGrid(_ vm: AudiobooksViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.filteredItems) { audiobook in
                AudiobookCardView(audiobook: audiobook) {
                    coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                }
            }
        }
        .id(vm.sortOption)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - By Author

    @ViewBuilder
    private var authorContent: some View {
        if isLoadingAuthors && authors.isEmpty {
            loadingGrid
        } else if let error = authorError, authors.isEmpty {
            ErrorStateView(message: error) {
                Task { await loadAuthors() }
            }
        } else {
            authorGrid
        }
    }

    private var sortedAuthors: [AudiobookAuthor] {
        guard let vm = viewModel else { return authors }
        switch vm.sortOption {
        case .authorZA:
            return authors.sorted { $0.name > $1.name }
        case .mostBooks:
            return authors.sorted { $0.audiobookCount > $1.audiobookCount }
        default:
            return authors.sorted { $0.name < $1.name }
        }
    }

    private var authorGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(sortedAuthors) { author in
                authorCard(author)
            }
        }
        .id(viewModel?.sortOption)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func authorCard(_ author: AudiobookAuthor) -> some View {
        Button {
            coordinator.navigate(to: .audiobookAuthorDetail(author: author.name))
        } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Color.clear
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .overlay {
                        authorThumbnail(author.thumbnail)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .bottomTrailing) {
                        countBadge(author.audiobookCount)
                    }
                    .glassCard()

                Text(author.name)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, minHeight: 36, alignment: .top)
            }
        }
        .buttonStyle(.plain)
    }

    private func authorThumbnail(_ urlString: String?) -> some View {
        Group {
            if let urlStr = urlString, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        authorPlaceholder
                    }
                }
            } else {
                authorPlaceholder
            }
        }
    }

    private var authorPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "person.fill")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    private func countBadge(_ count: Int) -> some View {
        Text("\(count)")
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 2)
            .background(DesignTokens.Primary.default)
            .cornerRadius(DesignTokens.Radius.sm)
            .padding(DesignTokens.Spacing.xs)
    }

    // MARK: - Loading

    private var loadingGrid: some View {
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

    // MARK: - Data Loading

    private func loadAuthors() async {
        isLoadingAuthors = true
        authorError = nil
        do {
            let response = try await repos.audiobook.fetchAuthors()
            authors = response.authors
        } catch {
            authorError = error.userFriendlyMessage
        }
        isLoadingAuthors = false
    }
}
