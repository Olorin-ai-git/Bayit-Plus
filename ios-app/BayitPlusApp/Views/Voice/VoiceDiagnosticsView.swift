#if os(iOS)
import AVFoundation
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import Speech
import SwiftUI
import UIKit

/// Debug diagnostics panel for voice capabilities.
///
/// Shows microphone permission status, speech recognition availability,
/// current voice state, last transcript, and audio session status.
/// Provides run-diagnostics and copy-report actions.
struct VoiceDiagnosticsView: View {

    let speechService: SpeechRecognitionService
    let orchestrator: VoiceOrchestrator

    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var micPermission: PermissionStatus = .undetermined
    @State private var speechAvailable = false
    @State private var lastTranscript = ""
    @State private var audioSessionActive = false
    @State private var isRunning = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    headerSection
                    micPermissionRow
                    speechRecognitionRow
                    voiceStateRow
                    transcriptRow
                    audioSessionRow
                    actionButtons
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.xl)
            }
        }
        .onAppear { runDiagnostics() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "stethoscope")
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("voice.diagnostics.title"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Diagnostic Rows

    private var micPermissionRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.micPermission"),
            value: micPermission.label,
            color: micPermission.color
        )
    }

    private var speechRecognitionRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.speechRecognition"),
            value: speechAvailable
                ? localization.t("common.yes")
                : localization.t("common.no"),
            color: speechAvailable
                ? DesignTokens.Success.default
                : DesignTokens.ErrorColor.default
        )
    }

    private var voiceStateRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.currentState"),
            value: orchestrator.state.rawValue,
            color: stateColor(for: orchestrator.state)
        )
    }

    private var transcriptRow: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("voice.diagnostics.transcript"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(lastTranscript.isEmpty ? "--" : lastTranscript)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .lineLimit(3)
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
    }

    private var audioSessionRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.audioSession"),
            value: audioSessionActive
                ? localization.t("common.active")
                : localization.t("common.inactive"),
            color: audioSessionActive
                ? DesignTokens.Success.default
                : DesignTokens.Text.disabled
        )
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("voice.diagnostics.runDiagnostics"),
                variant: .primary,
                isLoading: isRunning
            ) {
                runDiagnostics()
            }

            GlassButton(
                localization.t("voice.diagnostics.copyReport"),
                variant: .secondary
            ) {
                copyReport()
            }
        }
    }

    // MARK: - Helpers

    private func diagnosticRow(label: String, value: String, color: Color) -> some View {
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

    private func stateColor(for state: VoiceState) -> Color {
        switch state {
        case .idle: return DesignTokens.Text.disabled
        case .listening: return DesignTokens.Primary.default
        case .processing: return DesignTokens.Warning.default
        case .speaking: return DesignTokens.Success.default
        case .error: return DesignTokens.ErrorColor.default
        }
    }

    private func runDiagnostics() {
        isRunning = true
        let permissions = speechService.checkPermissions()
        micPermission = permissions.microphone ? .granted : micPermissionStatus()
        speechAvailable = permissions.speechRecognition
        lastTranscript = orchestrator.currentTranscript
        audioSessionActive = AVAudioSession.sharedInstance().isOtherAudioPlaying
            || AVAudioSession.sharedInstance().category == .record
        isRunning = false
    }

    private func micPermissionStatus() -> PermissionStatus {
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

    private func copyReport() {
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

private enum PermissionStatus {
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
