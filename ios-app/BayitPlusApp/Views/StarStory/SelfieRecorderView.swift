import BayitDesignSystem
import BayitLocalization
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

struct SelfieRecorderView: View {
    @Environment(LocalizationManager.self) private var localization

    let onVideoRecorded: (Data) -> Void
    let onCancel: () -> Void

    @State private var cameraManager = CameraRecordingManager()
    @State private var elapsedSeconds = 0
    @State private var countdownTimer: Timer?
    @State private var selectedItem: PhotosPickerItem?

    private let maxDurationSeconds = 10

    private var isCameraAvailable: Bool {
        cameraManager.captureSession != nil
    }

    var body: some View {
        ZStack {
            if isCameraAvailable {
                cameraPreview
            } else {
                noCameraPlaceholder
            }
            VStack {
                Spacer()
                controlsOverlay
            }
        }
        .onDrop(of: [.movie, .mpeg4Movie], isTargeted: nil, perform: handleDrop)
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
        .onChange(of: selectedItem) { _, item in
            guard let item else { return }
            Task { await loadVideo(from: item) }
        }
    }

    @ViewBuilder
    private var cameraPreview: some View {
        if let session = cameraManager.captureSession {
            CameraPreviewView(session: session)
                .ignoresSafeArea()
        }
    }

    private var noCameraPlaceholder: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()
            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: "video.badge.plus")
                    .font(.system(size: DesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("avatar.selfie.dropHint"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
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

                if isCameraAvailable {
                    recordButton(recording: cameraManager.isRecording)
                }
            }

            uploadButton
                .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.bottom, DesignTokens.Spacing.xxl)
    }

    private var uploadButton: some View {
        PhotosPicker(selection: $selectedItem, matching: .videos) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "photo.on.rectangle")
                    .font(.system(size: DesignTokens.FontSize.base))
                Text(localization.t("avatar.selfie.uploadFromLibrary"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .foregroundStyle(DesignTokens.Text.primary)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
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
                .fill(recording ? DesignTokens.ErrorColor.default : DesignTokens.Primary.p400)
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

    private func loadVideo(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }
        onVideoRecorded(data)
    }

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first else { return false }
        let type: UTType = provider.hasItemConformingToTypeIdentifier(UTType.mpeg4Movie.identifier)
            ? .mpeg4Movie : .movie
        _ = provider.loadDataRepresentation(for: type) { data, _ in
            guard let data else { return }
            Task { @MainActor in
                onVideoRecorded(data)
            }
        }
        return true
    }
}
