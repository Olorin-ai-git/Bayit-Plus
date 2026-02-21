import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Multi-step AI-powered onboarding flow with animated transitions,
/// progress indicator, and four distinct setup steps.
struct OnboardingAIView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @Environment(NavigationCoordinator.self) var coordinator
    @State private var viewModel: OnboardingAIViewModel?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if let vm = viewModel {
                VStack(spacing: 0) {
                    progressIndicator(vm)
                    stepContent(vm)
                    navigationButtons(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .task {
            if viewModel == nil {
                viewModel = OnboardingAIViewModel(userRepository: repos.user)
            }
        }
    }
}
