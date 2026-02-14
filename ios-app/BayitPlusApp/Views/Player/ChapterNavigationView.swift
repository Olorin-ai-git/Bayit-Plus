import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Standalone chapter navigation screen wrapper.
/// Instantiates ChapterNavigationViewModel, loads chapters, and delegates to ChapterListView.
struct ChapterNavigationView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ChapterNavigationViewModel?

    let contentId: String

    var body: some View {
        Group {
            if let vm = viewModel {
                if vm.isLoading && vm.chapters.isEmpty {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = vm.error, vm.chapters.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.loadChapters(contentId: contentId) }
                    }
                } else if vm.chapters.isEmpty {
                    emptyState
                } else {
                    ChapterListView(
                        chapters: vm.chapters,
                        activeChapter: vm.activeChapter,
                        onChapterSelected: { _ in }
                    )
                }
            } else {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
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

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "list.bullet")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("chapters.noChapters"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
        .accessibilityElement(children: .combine)
    }
}
