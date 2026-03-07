import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

// MARK: - TVOnboardingVoiceStep + Recording & Orb

extension TVOnboardingVoiceStep {
    var voiceOrbSection: some View {
        Button {
            Task { await toggleRecording() }
        } label: {
            ZStack {
                Circle()
                    .stroke(orbColor.opacity(0.2), lineWidth: 2)
                    .frame(width: 180, height: 180)
                    .scaleEffect(isRecording ? 1.1 : 1.0)
                    .animation(
                        isRecording
                            ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                            : .easeInOut(duration: 0.4),
                        value: isRecording
                    )

                Circle()
                    .fill(orbColor.opacity(0.15))
                    .frame(width: 130, height: 130)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                            center: .center,
                            startRadius: 0,
                            endRadius: 50
                        )
                    )
                    .frame(width: 100, height: 100)

                orbIcon
            }
        }
        .tvCardStyle()
        .disabled(isTranscribing)
    }

    @ViewBuilder
    var orbIcon: some View {
        if isRecording {
            Image(systemName: "waveform")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .symbolEffect(.variableColor, options: .repeating, value: isRecording)
        } else if isTranscribing {
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.5)
        } else {
            Image(systemName: "mic")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    var orbColor: Color {
        if isRecording { return Color.red }
        if isTranscribing { return DesignTokens.Primary.p400 }
        return DesignTokens.Primary.p400
    }

    func toggleRecording() async {
        if isRecording {
            let audioData = audioService.stopRecording()
            isRecording = false
            guard !audioData.isEmpty else {
                micError = localization.t("onboarding.voice.noAudio")
                return
            }
            isTranscribing = true
            micError = nil
            // Voice name transcription requires ChatRepository;
            // gracefully fall back to text input
            isTranscribing = false
            micError = localization.t("onboarding.voice.useTextInput")
        } else {
            micError = nil
            do {
                try audioService.startRecording()
                isRecording = true
                logger.info("Voice name recording started")
            } catch {
                micError = localization.t("onboarding.voice.micUnavailable")
                logger.error("Mic unavailable for voice name", error: error)
            }
        }
    }
}
