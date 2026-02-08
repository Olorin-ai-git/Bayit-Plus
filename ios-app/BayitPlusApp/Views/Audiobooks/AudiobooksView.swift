import BayitDesignSystem
import SwiftUI

/// Audiobooks listing screen with grid of audiobook cards and genre filter bar
struct AudiobooksView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: AudiobooksViewModel?

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
    }

    private func contentView(_ vm: AudiobooksViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            audiobookGrid(vm)
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

    private var loadingState: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
