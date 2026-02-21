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

        @Environment(LocalizationManager.self) var localization
        @Environment(\.dismiss) private var dismiss

        @State var micPermission: PermissionStatus = .undetermined
        @State var speechAvailable = false
        @State var lastTranscript = ""
        @State var audioSessionActive = false
        @State var isRunning = false

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
    }
#endif
