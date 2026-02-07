import BayitDesignSystem
import BayitVoice
import SwiftUI

/// Multi-step voice onboarding flow: welcome, permissions, language selection.
/// Guides users through microphone/speech permissions and preferred language setup.
struct VoiceOnboardingView: View {

    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: VoiceOnboardingViewModel

    init(speechService: SpeechRecognitionService) {
        _viewModel = State(initialValue: VoiceOnboardingViewModel(
            speechService: speechService
        ))
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                progressBar
                    .padding(.horizontal, DesignTokens.Spacing.base)
                    .padding(.top, DesignTokens.Spacing.sm)

                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xxl) {
                        stepContent
                    }
                    .padding(.horizontal, DesignTokens.Spacing.base)
                    .padding(.top, DesignTokens.Spacing.xxl)
                    .padding(.bottom, DesignTokens.Spacing.xxxxl)
                }

                bottomActions
                    .padding(.horizontal, DesignTokens.Spacing.base)
                    .padding(.bottom, DesignTokens.Spacing.xxl)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Skip") { viewModel.skip() }
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .onChange(of: viewModel.isComplete) { _, isComplete in
            if isComplete { coordinator.pop() }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: 4)

                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Primary.default)
                    .frame(width: proxy.size.width * viewModel.progress, height: 4)
                    .animation(.easeInOut(duration: 0.3), value: viewModel.progress)
            }
        }
        .frame(height: 4)
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .welcome:
            VoiceWelcomeStep()
        case .permissions:
            VoicePermissionsStep(permissions: viewModel.permissions)
        case .languageSelect:
            VoiceLanguageSelectStep(
                selectedLanguage: Bindable(viewModel).selectedLanguage,
                availableLanguages: viewModel.availableLanguages
            )
        case .complete:
            EmptyView()
        }
    }

    // MARK: - Bottom Actions

    private var bottomActions: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            switch viewModel.currentStep {
            case .welcome:
                GlassButton("Get Started", variant: .primary) {
                    viewModel.advance()
                }

            case .permissions:
                if viewModel.permissions.allGranted {
                    GlassButton("Continue", variant: .primary) {
                        viewModel.advance()
                    }
                } else {
                    GlassButton(
                        "Grant Permissions",
                        variant: .primary,
                        isLoading: viewModel.isRequestingPermissions
                    ) {
                        Task { await viewModel.requestPermissions() }
                    }
                }

            case .languageSelect:
                GlassButton("Complete Setup", variant: .primary) {
                    viewModel.advance()
                }

            case .complete:
                EmptyView()
            }
        }
    }
}
