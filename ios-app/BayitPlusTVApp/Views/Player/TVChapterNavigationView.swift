import BayitDesignSystem
import SwiftUI

/// Standalone chapter navigation screen for tvOS.
/// Instantiates ChapterNavigationViewModel, loads chapters, and delegates to TVChapterListView.
/// Uses TVRepositoryProvider and inline error display (avoids iOS-only ErrorStateView).
struct TVChapterNavigationView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: ChapterNavigationViewModel?

    let contentId: String
    let onChapterSelected: (Chapter) -> Void

    var body: some View {
        Group {
            if let vm = viewModel {
                if vm.isLoading && vm.chapters.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.chapters.isEmpty {
                    errorState(message: error, viewModel: vm)
                } else if vm.chapters.isEmpty {
                    emptyState
                } else {
                    TVChapterListView(
                        chapters: vm.chapters,
                        activeChapter: vm.activeChapter,
                        onChapterSelected: onChapterSelected
                    )
                }
            } else {
                loadingState
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = ChapterNavigationViewModel(repository: repos.chapter)
            }
            await viewModel?.loadChapters(contentId: contentId)
        }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        ProgressView()
            .tint(DesignTokens.Primary.default)
            .scaleEffect(1.5)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error State

    private func errorState(message: String, viewModel: ChapterNavigationViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundColor(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            Button {
                Task { await viewModel.loadChapters(contentId: contentId) }
            } label: {
                Text("Retry")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                    .background(DesignTokens.Glass.bgMedium)
                    .cornerRadius(TVDesignTokens.Radius.md)
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "list.bullet")
                .font(.system(size: 72))
                .foregroundColor(DesignTokens.Text.muted)

            Text("No chapters available")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxl)
        .accessibilityElement(children: .combine)
    }
}
