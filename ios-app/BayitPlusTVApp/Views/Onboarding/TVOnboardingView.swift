import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Multi-step onboarding flow matching iOS: Welcome -> Feature Cards -> Voice -> Complete
struct TVOnboardingView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let profileId: String
    let onComplete: () -> Void

    @State private var viewModel: TVOnboardingViewModel?
    @State private var tourViewModel: TVFeatureTourViewModel?
    @State private var showTour = false

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary.ignoresSafeArea()

            if let vm = viewModel {
                VStack(spacing: 0) {
                    if vm.currentStep != .complete {
                        topBar(vm: vm)
                    }
                    stepContent(vm: vm)
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                }
                .animation(.easeInOut(duration: 0.4), value: vm.currentStep)
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

    // MARK: - Top Bar (Progress + Skip)

    private func topBar(vm: TVOnboardingViewModel) -> some View {
        HStack {
            progressCapsules(vm: vm)
            Spacer()
            Button {
                vm.skipOnboarding()
                onComplete()
            } label: {
                Text(localization.t("onboarding.skip"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.top, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.sm)
    }

    private func progressCapsules(vm: TVOnboardingViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            ForEach(
                TVOnboardingStep.allCases.filter { $0 != .complete },
                id: \.rawValue
            ) { step in
                Capsule()
                    .fill(
                        step.rawValue <= vm.currentStep.rawValue
                            ? DesignTokens.Colors.Primary.base
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(height: 4)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: vm.currentStep)
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

        case .aiLanguage:
            TVOnboardingFeatureCard(
                imageName: "onboarding_ai_language",
                titleKey: "onboarding.aiLanguage.title",
                titleArgs: ["language": localization.currentLanguage.displayName],
                subtitleKey: "onboarding.aiLanguage.subtitle",
                pills: [
                    "onboarding.aiLanguage.dubbing",
                    "onboarding.aiLanguage.subtitles",
                    "onboarding.aiLanguage.engrew",
                ]
            ) { vm.nextStep() }

        case .pauseAsk:
            TVOnboardingFeatureCard(
                imageName: "onboarding_pause_ask",
                titleKey: "onboarding.pauseAsk.title",
                subtitleKey: "onboarding.pauseAsk.subtitle",
                pills: ["onboarding.pauseAsk.pill"]
            ) { vm.nextStep() }

        case .interactive:
            TVOnboardingFeatureCard(
                imageName: "onboarding_interactive",
                titleKey: "onboarding.interactive.title",
                subtitleKey: "onboarding.interactive.subtitle",
                pills: [
                    "onboarding.interactive.moments",
                    "onboarding.interactive.trivia",
                ]
            ) { vm.nextStep() }

        case .neverMiss:
            TVOnboardingFeatureCard(
                imageName: "onboarding_catchup_byoc",
                titleKey: "onboarding.neverMiss.title",
                subtitleKey: "onboarding.neverMiss.subtitle",
                pills: [
                    "onboarding.neverMiss.catchup",
                    "onboarding.neverMiss.byoc",
                ]
            ) { vm.nextStep() }

        case .zehAni:
            TVOnboardingFeatureCard(
                imageName: "onboarding_zeh_ani",
                titleKey: "onboarding.zehAni.title",
                subtitleKey: "onboarding.zehAni.subtitle",
                pills: ["onboarding.zehAni.pill"]
            ) { vm.nextStep() }

        case .language:
            TVOnboardingLanguageStep(viewModel: vm)

        case .interests:
            TVOnboardingInterestsStep(viewModel: vm)

        case .culture:
            TVOnboardingCultureStep(viewModel: vm)

        case .voiceSetup:
            TVOnboardingVoiceStep(viewModel: vm)

        case .complete:
            TVOnboardingCompleteStep(viewModel: vm) {
                Task {
                    await vm.savePreferences()
                    onComplete()
                }
            }
        }
    }
}
