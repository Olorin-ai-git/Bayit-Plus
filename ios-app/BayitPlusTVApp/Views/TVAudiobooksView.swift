import BayitDesignSystem
import SwiftUI

/// tvOS Audiobooks screen with horizontal shelf displaying audiobook covers.
/// Reuses AudiobooksViewModel from shared ViewModels.
struct TVAudiobooksView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: AudiobooksViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.items.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.refresh() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    contentShelf(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = AudiobooksViewModel(repository: repos.audiobook)
            }
            await viewModel?.loadInitial()
        }
    }

    private func contentShelf(_ vm: AudiobooksViewModel) -> some View {
        GlassContentShelf(title: "Audiobooks", items: vm.items) { audiobook in
            GlassFocusPoster(
                thumbnailURL: audiobook.coverImage,
                title: audiobook.title ?? "Audiobook",
                subtitle: audiobook.author,
                badge: progressBadge(audiobook),
                aspectRatio: 2 / 3
            )
        }
    }

    private func progressBadge(_ audiobook: AudiobookItem) -> String? {
        guard let progress = audiobook.progress, progress > 0, progress < 100 else {
            return nil
        }
        return "\(Int(progress))%"
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "book.closed")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text("No audiobooks available")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Audiobooks...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
