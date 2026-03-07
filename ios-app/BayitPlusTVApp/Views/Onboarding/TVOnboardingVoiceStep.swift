import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// Voice name input step using Siri Remote microphone with text fallback.
/// On tvOS, Speech framework is not available so we use backend transcription.
struct TVOnboardingVoiceStep: View {
    @Environment(LocalizationManager.self) var localization
    @Bindable var viewModel: TVOnboardingViewModel

    @State var isRecording = false
    @State var isTranscribing = false
    @State var micError: String?
    @FocusState var isNameFocused: Bool

    let audioService = TVAudioRecordingService()
    let logger = BayitLogger(category: "TVOnboardingVoice")

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Spacer()

            headerSection
            voiceOrbSection
            textInputSection

            if let error = micError {
                errorLabel(error)
            }

            Spacer()

            navigationButtons
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.voice.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.voice.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Text Input

    var textInputSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.voice.orType"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .frame(maxWidth: .infinity, alignment: .center)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "person.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)

                TextField("", text: $viewModel.userName)
                    .textFieldStyle(.plain)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .tint(DesignTokens.Colors.Primary.light)
                    .focused($isNameFocused)
                    .autocorrectionDisabled()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(isNameFocused ? DesignTokens.Glass.bgMedium : DesignTokens.Glass.bgLight)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        isNameFocused ? DesignTokens.Colors.Primary.base : DesignTokens.Glass.border,
                        lineWidth: isNameFocused ? 2 : 1
                    )
            )
        }
        .frame(maxWidth: TVDesignTokens.Form.maxWidth)
    }

    // MARK: - Error

    func errorLabel(_ message: String) -> some View {
        Text(message)
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Colors.Semantic.error)
            .multilineTextAlignment(.center)
    }

    // MARK: - Navigation

    var navigationButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("common.back"),
                variant: .secondary,
                size: .medium
            ) {
                if isRecording { audioService.cancelRecording() }
                viewModel.previousStep()
            }

            GlassButton(
                localization.t("common.next"),
                variant: .primary,
                size: .medium,
                icon: Image(systemName: "arrow.right")
            ) {
                viewModel.nextStep()
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
