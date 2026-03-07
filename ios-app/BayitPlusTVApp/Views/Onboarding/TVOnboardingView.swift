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
