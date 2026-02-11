#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Slide-in AI companion sidebar with Context, Quiz, Vocabulary tabs.
struct AICompanionSidebarView: View {

    @State private var viewModel: AICompanionViewModel
    let contentId: String
    let onDismiss: () -> Void

    init(repository: any ChatRepository, contentId: String, onDismiss: @escaping () -> Void) {
        _viewModel = State(initialValue: AICompanionViewModel(repository: repository))
        self.contentId = contentId
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            tabSelector
            tabContent
        }
        .frame(maxWidth: 360)
        .background(DesignTokens.Background.elevated)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .shadow(color: .black.opacity(0.3), radius: 20)
        .task { await viewModel.loadContent(contentId: contentId) }
    }

    private var header: some View {
        HStack {
            Image(systemName: "sparkles")
                .foregroundStyle(DesignTokens.Primary.p300)
            Text("AI Companion")
                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var tabSelector: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(AICompanionViewModel.Tab.allCases, id: \.self) { tab in
                GlassButton(
                    tab.rawValue,
                    variant: viewModel.selectedTab == tab ? .primary : .ghost,
                    size: .small
                ) {
                    viewModel.selectTab(tab)
                    Task { await loadTabContent(tab) }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    @ViewBuilder
    private var tabContent: some View {
        if viewModel.isLoading {
            Spacer()
            ProgressView().tint(DesignTokens.Primary.default)
            Spacer()
        } else {
            switch viewModel.selectedTab {
            case .context:
                CompanionContextTab(viewModel: viewModel)
            case .quiz:
                CompanionQuizTab(viewModel: viewModel)
            case .vocabulary:
                CompanionVocabularyTab(viewModel: viewModel)
            }
        }
    }

    private func loadTabContent(_ tab: AICompanionViewModel.Tab) async {
        switch tab {
        case .context:
            await viewModel.loadContent(contentId: contentId)
        case .quiz:
            await viewModel.loadQuiz(contentId: contentId)
        case .vocabulary:
            await viewModel.loadVocabulary(contentId: contentId)
        }
    }
}
#endif
