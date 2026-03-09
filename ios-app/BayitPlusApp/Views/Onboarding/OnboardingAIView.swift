import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Multi-step AI-powered onboarding flow with animated transitions,
/// progress indicator, and four distinct setup steps.
struct OnboardingAIView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(AuthManager.self) var authManager
    @State private var viewModel: OnboardingAIViewModel?
    @State private var tourViewModel: FeatureTourViewModel?
    @State private var showTour = false

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
        .fullScreenCover(isPresented: $showTour) {
            if let tourVM = tourViewModel {
                FeatureTourView(viewModel: tourVM) {
                    showTour = false
                }
                .environment(localization)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = OnboardingAIViewModel(userRepository: repos.user)
            }
            if tourViewModel == nil {
                let userId = authManager.user?.id ?? "anonymous"
                let tourVM = FeatureTourViewModel(
                    apiClient: repos.apiClient,
                    userId: userId
                )
                tourViewModel = tourVM
                if tourVM.shouldShowTour {
                    showTour = true
                }
            }
        }
    }
}
