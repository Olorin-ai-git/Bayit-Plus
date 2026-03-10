import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Detail screen showing all audiobooks by a specific author
struct AudiobookAuthorDetailView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: AudiobooksViewModel?

    let author: String

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
        .navigationTitle(author)
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                let vm = AudiobooksViewModel(repository: repos.audiobook)
                vm.selectedAuthor = author
                viewModel = vm
            }
            await viewModel?.loadInitial()
        }
    }

    private func contentView(_ vm: AudiobooksViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            authorHeader(itemCount: vm.items.count)
            audiobookGrid(vm)
        }
    }

    private func authorHeader(itemCount: Int) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("audiobooks.authorCount", ["count": "\(itemCount)"]))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.sm)
    }

    private func audiobookGrid(_ vm: AudiobooksViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { audiobook in
                AudiobookCardView(audiobook: audiobook) {
                    coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

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
