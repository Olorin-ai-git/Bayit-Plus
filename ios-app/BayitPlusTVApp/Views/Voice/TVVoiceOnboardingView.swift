import BayitDesignSystem
import SwiftUI

/// Simplified voice onboarding for tvOS. No mic permissions — just welcome and language.
struct TVVoiceOnboardingView: View {

    @State private var currentStep: OnboardingStep = .welcome
    @State private var selectedLanguage: SupportedLanguage = .english

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                progressBar
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.top, TVDesignTokens.Spacing.md)

                ScrollView {
                    VStack(spacing: TVDesignTokens.Spacing.xxl) {
                        stepContent
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.top, TVDesignTokens.Spacing.xxl)
                    .padding(.bottom, TVDesignTokens.Spacing.xxxxl)
                }

                bottomActions
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: 6)

                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(DesignTokens.Primary.default)
                    .frame(width: proxy.size.width * progress, height: 6)
                    .animation(.easeInOut(duration: 0.3), value: progress)
            }
        }
        .frame(height: 6)
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .welcome:
            TVVoiceWelcomeStep()
        case .languageSelect:
            TVVoiceLanguageSelectStep(
                selectedLanguage: $selectedLanguage,
                availableLanguages: SupportedLanguage.allCases
            )
        case .complete:
            EmptyView()
        }
    }

    // MARK: - Bottom Actions

    private var bottomActions: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton("Skip", variant: .secondary, size: .medium) {
                currentStep = .complete
            }
            .tvFocusStyle()

            switch currentStep {
            case .welcome:
                GlassButton("Get Started", variant: .primary, size: .medium) {
                    currentStep = .languageSelect
                }
                .tvFocusStyle()

            case .languageSelect:
                GlassButton("Complete Setup", variant: .primary, size: .medium) {
                    currentStep = .complete
                }
                .tvFocusStyle()

            case .complete:
                EmptyView()
            }
        }
    }

    // MARK: - Computed

    private var progress: Double {
        switch currentStep {
        case .welcome: return 0.33
        case .languageSelect: return 0.66
        case .complete: return 1.0
        }
    }
}

// MARK: - Onboarding Steps

private enum OnboardingStep {
    case welcome
    case languageSelect
    case complete
}
