import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Shared Components and Navigation

extension OnboardingAIView {
    // MARK: - Progress Indicator

    func progressIndicator(_ vm: OnboardingAIViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(OnboardingAIViewModel.Step.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(
                        step.rawValue <= vm.currentStepIndex
                            ? DesignTokens.Primary.default
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(height: DesignTokens.Spacing.xs)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)
        .animation(.easeInOut(duration: 0.3), value: vm.currentStepIndex)
    }

    // MARK: - Step Content Router

    func stepContent(_ vm: OnboardingAIViewModel) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                switch vm.currentStep {
                case .welcome:
                    welcomeStep(vm)
                case .contentTaste:
                    contentTasteStep(vm)
                case .voiceSetup:
                    voiceSetupStep(vm)
                case .profileCreation:
                    profileCreationStep(vm)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
        .frame(maxHeight: .infinity)
    }

    // MARK: - Navigation Buttons

    func navigationButtons(_ vm: OnboardingAIViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if vm.currentStep == .welcome {
                GlassButton(
                    localization.t("onboarding.skip"),
                    variant: .ghost,
                    size: .medium
                ) {
                    vm.skipOnboarding()
                    if let onComplete {
                        onComplete()
                    } else {
                        coordinator.pop()
                    }
                }
            } else {
                GlassButton(
                    localization.t("onboarding.back"),
                    variant: .ghost,
                    size: .medium
                ) {
                    HapticFeedbackService.selection()
                    withAnimation(.easeInOut(duration: 0.3)) {
                        vm.previousStep()
                    }
                }
            }

            Spacer()

            if vm.currentStep == .profileCreation {
                GlassButton(
                    localization.t("onboarding.finish"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: !vm.canProceed
                ) {
                    HapticFeedbackService.notification(type: .success)
                    Task {
                        await vm.completeOnboarding()
                        if vm.isComplete {
                            if let onComplete {
                                onComplete()
                            } else {
                                coordinator.pop()
                            }
                        }
                    }
                }
            } else {
                GlassButton(
                    localization.t("onboarding.next"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: !vm.canProceed
                ) {
                    HapticFeedbackService.selection()
                    withAnimation(.easeInOut(duration: 0.3)) {
                        vm.nextStep()
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Preference Row

    func preferenceRow(
        icon: String, title: String, value: String
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Toggle Preference

    func togglePreference(
        icon: String,
        title: String,
        isOn: Bool,
        onChange: @escaping (Bool) -> Void
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Toggle("", isOn: Binding(
                get: { isOn },
                set: { onChange($0) }
            ))
            .tint(DesignTokens.Primary.default)
            .labelsHidden()
        }
    }
}
