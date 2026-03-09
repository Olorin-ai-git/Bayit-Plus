import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingFlowView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel = OnboardingFlowViewModel()
    var onComplete: () -> Void

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                if viewModel.currentStep != .launch {
                    topBar
                }

                stepContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            }
        }
        .animation(.easeInOut(duration: 0.4), value: viewModel.currentStepIndex)
    }

    private var topBar: some View {
        HStack {
            progressCapsules
            Spacer()
            GlassButton(
                localization.t("onboarding.skip"),
                variant: .ghost,
                size: .small
            ) {
                viewModel.skip()
                onComplete()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.md)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    private var progressCapsules: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(
                OnboardingFlowViewModel.Step.allCases.filter { $0 != .launch },
                id: \.rawValue
            ) { step in
                Capsule()
                    .fill(
                        step.rawValue <= viewModel.currentStepIndex
                            ? DesignTokens.Primary.default
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(height: 3)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: viewModel.currentStepIndex)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .welcome:
            OnboardingWelcomeView(viewModel: viewModel) {
                advance()
            }
        case .aiLanguage:
            OnboardingFeatureCard(
                imageName: "onboarding_ai_language",
                titleKey: "onboarding.aiLanguage.title",
                titleArgs: ["language": viewModel.selectedLanguage.displayName],
                subtitleKey: "onboarding.aiLanguage.subtitle",
                pills: [
                    "onboarding.aiLanguage.dubbing",
                    "onboarding.aiLanguage.subtitles",
                    "onboarding.aiLanguage.engrew",
                ]
            ) { advance() }
        case .pauseAsk:
            OnboardingFeatureCard(
                imageName: "onboarding_pause_ask",
                titleKey: "onboarding.pauseAsk.title",
                subtitleKey: "onboarding.pauseAsk.subtitle",
                pills: ["onboarding.pauseAsk.pill"]
            ) { advance() }
        case .interactive:
            OnboardingFeatureCard(
                imageName: "onboarding_interactive",
                titleKey: "onboarding.interactive.title",
                subtitleKey: "onboarding.interactive.subtitle",
                pills: [
                    "onboarding.interactive.moments",
                    "onboarding.interactive.trivia",
                ]
            ) { advance() }
        case .neverMiss:
            OnboardingFeatureCard(
                imageName: "onboarding_catchup_byoc",
                titleKey: "onboarding.neverMiss.title",
                subtitleKey: "onboarding.neverMiss.subtitle",
                pills: [
                    "onboarding.neverMiss.catchup",
                    "onboarding.neverMiss.byoc",
                ]
            ) { advance() }
        case .zehAni:
            OnboardingFeatureCard(
                imageName: "onboarding_zeh_ani",
                titleKey: "onboarding.zehAni.title",
                subtitleKey: "onboarding.zehAni.subtitle",
                pills: ["onboarding.zehAni.pill"]
            ) { advance() }
        case .voiceSetup:
            OnboardingVoiceSetupView(viewModel: viewModel) {
                viewModel.completeOnboarding()
                advance()
            }
        case .launch:
            OnboardingLaunchView {
                onComplete()
            }
        }
    }

    private func advance() {
        HapticFeedbackService.selection()
        withAnimation(.easeInOut(duration: 0.4)) {
            viewModel.nextStep()
        }
    }
}
