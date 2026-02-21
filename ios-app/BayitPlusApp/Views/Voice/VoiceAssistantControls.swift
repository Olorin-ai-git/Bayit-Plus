import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI
import UIKit

/// Voice orb visualization, voice button controls, and actions for the voice assistant sheet.
extension VoiceAssistantSheet {
    // MARK: - Voice Orb

    var voiceOrb: some View {
        ZStack {
            Circle()
                .stroke(orbColor.opacity(0.2), lineWidth: 2)
                .frame(width: outerRingSize, height: outerRingSize)
                .scaleEffect(isListening ? 1.15 : 1.0)
                .animation(
                    isListening
                        ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.4),
                    value: isListening
                )

            Circle()
                .fill(orbColor.opacity(0.15))
                .frame(width: 120, height: 120)
                .scaleEffect(isListening ? 1.0 + audioLevel * 0.3 : 1.0)
                .animation(.easeOut(duration: 0.1), value: audioLevel)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 45
                    )
                )
                .frame(width: 90, height: 90)

            stateIcon
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isListening)
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isProcessing)
    }

    @ViewBuilder
    var stateIcon: some View {
        if isProcessing {
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.3)
        } else if isListening {
            Image(systemName: "mic.fill")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        } else {
            Image(systemName: "waveform")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    var orbColor: Color {
        if isProcessing {
            return DesignTokens.Warning.default
        } else if isListening {
            return DesignTokens.Primary.default
        } else if !aiResponse.isEmpty {
            return DesignTokens.Success.default
        } else {
            return DesignTokens.Primary.p400
        }
    }

    var outerRingSize: CGFloat {
        if isListening { return 180 }
        if isProcessing { return 160 }
        return 170
    }

    // MARK: - Voice Button

    var voiceButton: some View {
        Button {
            handleVoiceButtonTap()
        } label: {
            ZStack {
                Circle()
                    .fill(voiceButtonColor)
                    .frame(width: 72, height: 72)

                Image(systemName: voiceButtonIcon)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .disabled(isProcessing)
        .accessibilityLabel(isListening ? "Stop listening" : "Start listening")
        .padding(.bottom, DesignTokens.Spacing.md)
    }

    var voiceButtonColor: Color {
        isListening ? DesignTokens.ErrorColor.default : DesignTokens.Primary.default
    }

    var voiceButtonIcon: String {
        isListening ? "stop.fill" : "mic.fill"
    }

    // MARK: - Actions

    func handleVoiceButtonTap() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        if isListening {
            stopListeningAndProcess()
        } else {
            startListening()
        }
    }
}
