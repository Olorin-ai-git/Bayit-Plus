import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct SelfieRecorderView: View {
    @Environment(LocalizationManager.self) private var localization

    let onVideoRecorded: (Data) -> Void
    let onCancel: () -> Void

    @State private var cameraManager = CameraRecordingManager()
    @State private var elapsedSeconds = 0
    @State private var countdownTimer: Timer?

    private let maxDurationSeconds = 10

    var body: some View {
        ZStack {
            cameraPreview
            VStack {
                Spacer()
                controlsOverlay
            }
        }
        .onAppear {
            cameraManager.setupSession()
            cameraManager.startSession()
        }
        .onDisappear {
            stopTimerAndRecording()
            cameraManager.stopSession()
        }
        .onChange(of: cameraManager.recordedVideoURL) { _, url in
            guard let url else { return }
            if let data = try? Data(contentsOf: url) {
                onVideoRecorded(data)
            }
            cameraManager.clearRecording()
        }
    }

    @ViewBuilder
    private var cameraPreview: some View {
        if let session = cameraManager.captureSession {
            CameraPreviewView(session: session)
                .ignoresSafeArea()
        } else {
            DesignTokens.Background.primary.ignoresSafeArea()
            if let error = cameraManager.error {
                Text(error)
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }
        }
    }

    private var controlsOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if cameraManager.isRecording {
                Text(formattedTime)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)
                    .shadow(radius: 2)
            }

            HStack(spacing: DesignTokens.Spacing.xl) {
                GlassButton(localization.t("common.cancel"), variant: .secondary, size: .medium) {
                    stopTimerAndRecording()
                    onCancel()
                }

                if cameraManager.isRecording {
                    recordButton(recording: true)
                } else {
                    recordButton(recording: false)
                }
            }
        }
        .padding(.bottom, DesignTokens.Spacing.xxl)
    }

    private func recordButton(recording: Bool) -> some View {
        Button {
            if recording {
                stopTimerAndRecording()
            } else {
                startRecording()
            }
        } label: {
            Circle()
                .fill(recording ? DesignTokens.Colors.Semantic.error : DesignTokens.Primary.p400)
                .frame(width: 72, height: 72)
                .overlay(
                    RoundedRectangle(cornerRadius: recording ? 8 : 36)
                        .fill(.white)
                        .frame(width: recording ? 28 : 64, height: recording ? 28 : 64)
                )
                .shadow(radius: 4)
        }
    }

    private var formattedTime: String {
        let remaining = maxDurationSeconds - elapsedSeconds
        return String(format: "0:%02d", max(remaining, 0))
    }

    private func startRecording() {
        elapsedSeconds = 0
        cameraManager.startRecording()
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
                elapsedSeconds += 1
                if elapsedSeconds >= maxDurationSeconds {
                    stopTimerAndRecording()
                }
            }
        }
    }

    private func stopTimerAndRecording() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        if cameraManager.isRecording {
            cameraManager.stopRecording()
        }
    }
}
