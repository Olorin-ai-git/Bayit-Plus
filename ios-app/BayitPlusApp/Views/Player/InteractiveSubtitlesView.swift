import BayitDesignSystem
import SwiftUI

/// Standalone interactive subtitles screen wrapper.
/// Delegates to the existing InteractiveSubtitlesOverlay and InteractiveSubtitlesViewModel.
struct InteractiveSubtitlesView: View {
    @Environment(RepositoryProvider.self) private var repos
    @State private var viewModel: InteractiveSubtitlesViewModel?

    let contentId: String

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            if let vm = viewModel {
                InteractiveSubtitlesOverlay(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: 0,
                    isTriviaActive: false,
                    language: nil,
                    repository: repos.subtitle
                )
            } else {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = InteractiveSubtitlesViewModel(
                    repository: repos.subtitle,
                    offlineCache: repos.offlineCache
                )
            }
        }
        .accessibilityLabel("Interactive subtitles for content")
    }
}
