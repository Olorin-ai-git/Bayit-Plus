import BayitBYOC
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Multi-step onboarding flow controller for first-run personalization.
/// Steps: Welcome -> Language -> Culture -> Interests -> Voice Name -> Complete
struct TVOnboardingView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let profileId: String
    let onComplete: () -> Void

    @State private var viewModel: TVOnboardingViewModel?
    @State private var showBYOCSources = false
    @State private var tourViewModel: TVFeatureTourViewModel?
    @State private var showTour = false

    var body: some View {
        ZStack {
            backgroundGradient

            if let vm = viewModel {
                VStack(spacing: 0) {
                    stepIndicator(vm: vm)
                    stepContent(vm: vm)
                }
            } else {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(2.0)
            }
        }
        .fullScreenCover(isPresented: $showTour) {
            if let tourVM = tourViewModel {
                TVFeatureTourView(viewModel: tourVM) {
                    showTour = false
                }
                .environment(localization)
            }
        }
        .task {
            if viewModel == nil {
                let vm = TVOnboardingViewModel(
                    profileId: profileId,
                    userRepository: repos.user,
                    settingsRepository: repos.settings
                )
                viewModel = vm
                if vm.isComplete {
                    onComplete()
                }
            }
            if tourViewModel == nil {
                let tourVM = TVFeatureTourViewModel(
                    apiClient: repos.apiClient,
                    userId: profileId
                )
                tourViewModel = tourVM
                #if !DEBUG
                    if tourVM.shouldShowTour {
                        showTour = true
                    }
                #endif
            }
        }
    }

    // MARK: - Step Indicator

    private func stepIndicator(vm: TVOnboardingViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            ForEach(TVOnboardingStep.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(
                        step.rawValue <= vm.currentStep.rawValue
                            ? DesignTokens.Colors.Primary.base
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(height: 4)
                    .animation(.easeInOut, value: vm.currentStep)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.top, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Step Content

    @ViewBuilder
    private func stepContent(vm: TVOnboardingViewModel) -> some View {
        switch vm.currentStep {
        case .welcome:
            TVOnboardingWelcomeStep(
                onNext: { vm.nextStep() },
                onSkip: {
                    vm.skipOnboarding()
                    onComplete()
                }
            )
            .transition(.move(edge: .trailing))

        case .language:
            TVOnboardingLanguageStep(viewModel: vm)
                .transition(.move(edge: .trailing))

        case .culture:
            TVOnboardingCultureStep(viewModel: vm)
                .transition(.move(edge: .trailing))

        case .interests:
            TVOnboardingInterestsStep(viewModel: vm)
                .transition(.move(edge: .trailing))

        case .byoc:
            TVOnboardingBYOCStep(viewModel: vm) {
                showBYOCSources = true
            }
            .transition(.move(edge: .trailing))
            .fullScreenCover(isPresented: $showBYOCSources) {
                TVBYOCSourceListView(onDismiss: { showBYOCSources = false })
            }

        case .voiceName:
            TVOnboardingVoiceStep(viewModel: vm)
                .transition(.move(edge: .trailing))

        case .complete:
            TVOnboardingCompleteStep(viewModel: vm) {
                Task {
                    await vm.savePreferences()
                    onComplete()
                }
            }
            .transition(.move(edge: .trailing))
        }
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                DesignTokens.Colors.Background.primary,
                Color.black,
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}
