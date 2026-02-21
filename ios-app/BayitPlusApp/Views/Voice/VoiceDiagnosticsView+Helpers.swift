#if os(iOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import BayitVoice
    import SwiftUI
    import UIKit

    /// Extension on VoiceDiagnosticsView providing diagnostic helpers and permission status.
    extension VoiceDiagnosticsView {
        // MARK: - Helpers

        func diagnosticRow(label: String, value: String, color: Color) -> some View {
            HStack {
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                HStack(spacing: DesignTokens.Spacing.sm) {
                    Circle()
                        .fill(color)
                        .frame(width: 10, height: 10)

                    Text(value)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        }

        func stateColor(for state: VoiceState) -> Color {
            switch state {
            case .idle: return DesignTokens.Text.disabled
            case .listening: return DesignTokens.Primary.default
            case .processing: return DesignTokens.Warning.default
            case .speaking: return DesignTokens.Success.default
            case .error: return DesignTokens.ErrorColor.default
            }
        }

        func runDiagnostics() {
            isRunning = true
            let permissions = speechService.checkPermissions()
            micPermission = permissions.microphone ? .granted : micPermissionStatus()
            speechAvailable = permissions.speechRecognition
            lastTranscript = orchestrator.currentTranscript
            audioSessionActive = AVAudioSession.sharedInstance().isOtherAudioPlaying
                || AVAudioSession.sharedInstance().category == .record
            isRunning = false
        }

        func micPermissionStatus() -> PermissionStatus {
            if #available(iOS 17.0, *) {
                switch AVAudioApplication.shared.recordPermission {
                case .granted: return .granted
                case .denied: return .denied
                case .undetermined: return .undetermined
                @unknown default: return .undetermined
                }
            } else {
                switch AVAudioSession.sharedInstance().recordPermission {
                case .granted: return .granted
                case .denied: return .denied
                case .undetermined: return .undetermined
                @unknown default: return .undetermined
                }
            }
        }

        func copyReport() {
            let report = [
                localization.t("voice.diagnostics.micPermission") + ": " + micPermission.label,
                localization.t("voice.diagnostics.speechRecognition") + ": " + (speechAvailable ? "yes" : "no"),
                localization.t("voice.diagnostics.currentState") + ": " + orchestrator.state.rawValue,
                localization.t("voice.diagnostics.transcript") + ": " + (lastTranscript.isEmpty ? "--" : lastTranscript),
                "Audio Session: " + (audioSessionActive ? "active" : "inactive"),
            ].joined(separator: "\n")

            UIPasteboard.general.string = report
        }
    }

    // MARK: - Permission Status

    enum PermissionStatus {
        case granted
        case denied
        case undetermined

        var label: String {
            switch self {
            case .granted: return "Granted"
            case .denied: return "Denied"
            case .undetermined: return "Undetermined"
            }
        }

        var color: Color {
            switch self {
            case .granted: return DesignTokens.Success.default
            case .denied: return DesignTokens.ErrorColor.default
            case .undetermined: return DesignTokens.Warning.default
            }
        }
    }
#endif
