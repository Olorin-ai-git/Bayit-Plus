#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitVoice
    import SwiftUI

    // MARK: - TVVoiceAssistantSheet + Orb & Input

    extension TVVoiceAssistantSheet {
        // MARK: - Query Orb

        var queryOrb: some View {
            ZStack {
                Circle()
                    .stroke(orbColor.opacity(0.2), lineWidth: 2)
                    .frame(width: 200, height: 200)
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .animation(
                        isAnimating
                            ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                            : .easeInOut(duration: 0.4),
                        value: isAnimating
                    )

                Circle()
                    .fill(orbColor.opacity(0.15))
                    .frame(width: 150, height: 150)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                            center: .center,
                            startRadius: 0,
                            endRadius: 55
                        )
                    )
                    .frame(width: 110, height: 110)

                stateIcon
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isRecording)
            .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isProcessing)
        }

        var isAnimating: Bool {
            isRecording || isProcessing || isTranscribing
        }

        @ViewBuilder
        var stateIcon: some View {
            if isRecording {
                Image(systemName: "waveform")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .symbolEffect(.variableColor, options: .repeating, value: isRecording)
            } else if isTranscribing || isProcessing {
                ProgressView()
                    .tint(DesignTokens.Text.primary)
                    .scaleEffect(1.5)
            } else if !aiResponse.isEmpty {
                Image(systemName: "checkmark")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
            } else {
                Image(systemName: "mic")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }

        var orbColor: Color {
            if isRecording { return Color.red }
            if isTranscribing { return DesignTokens.Primary.p400 }
            if isProcessing { return DesignTokens.Warning.default }
            if !aiResponse.isEmpty { return DesignTokens.Success.default }
            return DesignTokens.Primary.p400
        }

        // MARK: - Microphone Button

        var microphoneButton: some View {
            Button {
                Task { await toggleRecording() }
            } label: {
                ZStack {
                    Circle()
                        .fill(isRecording ? Color.red.opacity(0.2) : DesignTokens.Glass.bgLight)
                        .frame(width: 60, height: 60)

                    if isRecording {
                        Circle()
                            .stroke(Color.red, lineWidth: 3)
                            .frame(width: 60, height: 60)
                            .scaleEffect(isRecording ? 1.15 : 1.0)
                            .opacity(isRecording ? 0.6 : 1.0)
                            .animation(
                                .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                                value: isRecording
                            )
                    }

                    Image(systemName: isRecording ? "mic.fill" : "mic")
                        .font(.system(size: 24))
                        .foregroundStyle(
                            isRecording ? Color.red : DesignTokens.Text.primary
                        )
                }
            }
            .tvCardStyle()
            .disabled(isProcessing || isTranscribing)
            .accessibilityLabel(isRecording ? "Stop recording" : "Start voice input")
            .accessibilityHint("Press to use Siri Remote microphone")
        }
    }
#endif
