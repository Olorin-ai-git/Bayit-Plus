#if os(tvOS)
import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVQuizOverlayView: View {
    let contentId: String
    let profileId: String?
    let onDismiss: () -> Void

    @Environment(TVRepositoryProvider.self) private var repositoryProvider
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: TriviaViewModel?
    @FocusState private var isCloseButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            if let viewModel {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    headerView

                    if viewModel.isLoading {
                        loadingView
                    } else if let error = viewModel.error {
                        errorView(error)
                    } else if viewModel.isComplete, let result = viewModel.result {
                        TVQuizResultsView(
                            result: result,
                            onPlayAgain: {
                                Task {
                                    await viewModel.loadQuiz(
                                        contentId: contentId,
                                        profileId: profileId
                                    )
                                }
                            },
                            onDismiss: onDismiss
                        )
                    } else if viewModel.quiz != nil {
                        TVQuizQuestionView(viewModel: viewModel)
                    }
                }
                .padding(TVDesignTokens.Spacing.xxl)
            } else {
                loadingView
            }
        }
        .task {
            let repository = repositoryProvider.trivia
            let vm = TriviaViewModel(repository: repository)
            viewModel = vm
            await vm.loadQuiz(contentId: contentId, profileId: profileId)
        }
    }

    private var headerView: some View {
        HStack {
            Text(localization.t("trivia.quiz.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .tvCardStyle()
            .focused($isCloseButtonFocused)
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ProgressView()
                .scaleEffect(2.0)
                .tint(DesignTokens.Primary.default)

            Text(localization.t("trivia.loading"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .padding(.top, TVDesignTokens.Spacing.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .tvCardStyle()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
#endif
