#if os(tvOS)
import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// tvOS diagnostics view for voice system status and capabilities.
struct TVVoiceDiagnosticsView: View {
    let audioService: TVAudioRecordingService
    let voiceService: TVVoiceInteractionService
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization
    @State private var micPermission: TVMicStatus = .undetermined
    @State private var audioAvailable = false
    @State private var audioSessionActive = false
    @State private var isRunning = false
    @FocusState private var focusedButton: DiagButton?

    private let logger = BayitLogger(category: "TVVoiceDiag")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                micPermissionRow
                audioAvailabilityRow
                voiceStateRow
                audioSessionRow
                transcriptRow
                actionButtons
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onAppear { runDiagnostics() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 120, height: 120)
                Image(systemName: "stethoscope")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }
            Text(localization.t("voice.diagnostics.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Rows

    private var micPermissionRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.micPermission"),
            value: micPermission.label, color: micPermission.color
        )
    }

    private var audioAvailabilityRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.speechRecognition"),
            value: audioAvailable ? localization.t("common.yes") : localization.t("common.no"),
            color: audioAvailable ? DesignTokens.Success.default : DesignTokens.ErrorColor.default
        )
    }

    private var voiceStateRow: some View {
        let stateLabel = voiceService.isListening ? "Listening"
            : voiceService.isProcessing ? "Processing" : "Idle"
        let stateColor = voiceService.isListening ? DesignTokens.Primary.default
            : voiceService.isProcessing ? DesignTokens.Warning.default : DesignTokens.Text.disabled
        return diagnosticRow(
            label: localization.t("voice.diagnostics.currentState"),
            value: stateLabel, color: stateColor
        )
    }

    private var audioSessionRow: some View {
        diagnosticRow(
            label: localization.t("voice.diagnostics.audioSession"),
            value: audioSessionActive ? localization.t("common.active") : localization.t("common.inactive"),
            color: audioSessionActive ? DesignTokens.Success.default : DesignTokens.Text.disabled
        )
    }

    private var transcriptRow: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("voice.diagnostics.transcript"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text(voiceService.lastTranscript ?? "--")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .lineLimit(3)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                localization.t("voice.diagnostics.runDiagnostics"),
                variant: .primary, isLoading: isRunning
            ) { runDiagnostics() }
                .tvFocusStyle()
                .focused($focusedButton, equals: .run)

            GlassButton(localization.t("common.done"), variant: .secondary) { onDismiss() }
                .tvFocusStyle()
                .focused($focusedButton, equals: .done)
        }
    }

    // MARK: - Helpers

    private func diagnosticRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Circle().fill(color).frame(width: 16, height: 16)
                Text(value)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func runDiagnostics() {
        isRunning = true
        micPermission = resolveMicPermission()
        audioAvailable = !audioService.isRecording
        let session = AVAudioSession.sharedInstance()
        audioSessionActive = session.isOtherAudioPlaying || session.category == .record
        isRunning = false
        logger.info("Diagnostics completed", context: [
            "mic": micPermission.label, "audio": "\(audioAvailable)",
        ])
    }

    private func resolveMicPermission() -> TVMicStatus {
        if #available(tvOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted: return .granted
            case .denied: return .denied
            default: return .undetermined
            }
        } else {
            return .undetermined
        }
    }
}

// MARK: - Supporting Types

private enum DiagButton: Hashable { case run, done }

private enum TVMicStatus {
    case granted, denied, undetermined

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
