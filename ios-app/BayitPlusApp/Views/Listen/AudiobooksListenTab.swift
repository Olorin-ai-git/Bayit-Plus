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

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: DesignTokens.Spacing.lg) {
                browseToggle
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
                    }
                    if mode == .byAuthor && authors.isEmpty {
                        Task { await loadAuthors() }
                    }
                }
            }
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
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
            ForEach(vm.items) { audiobook in
                AudiobookCardView(audiobook: audiobook) {
                    coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                }
                .onAppear {
                    if audiobook.id == vm.items.last?.id {
                        Task { await vm.loadMore() }
                    }
                }
            }

            if vm.isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
            }
        }
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

    private var authorGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(authors) { author in
                authorCard(author)
            }
        }
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
