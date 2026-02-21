import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing the recording button, download button,
/// recording start/stop logic, recording timer, and duration formatting.
extension PlayerView {
    // MARK: - Recording Button

    var recordingButton: some View {
        Button {
            Task {
                if isRecording {
                    await stopRecording()
                } else {
                    await startRecording()
                }
            }
        } label: {
            Image(systemName: isRecording ? "circle.fill" : "circle")
                .font(.system(size: 18))
                .foregroundStyle(isRecording ? Color.red : .white)
                .frame(width: 44, height: 44)
                .overlay {
                    if isRecording {
                        Circle()
                            .stroke(Color.red, lineWidth: 2)
                            .scaleEffect(1.2)
                            .opacity(0.5)
                            .animation(
                                .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                                value: isRecording
                            )
                    }
                }
        }
        .accessibilityLabel(isRecording ? localization.t("player.stopRecording") : localization.t("player.startRecording"))
    }

    // MARK: - Recording Indicator Overlay

    var recordingIndicatorOverlay: some View {
        VStack {
            HStack {
                Spacer()
                GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.sm) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 8, height: 8)
                            .opacity(0.8)
                            .animation(
                                .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                                value: isRecording
                            )
                        Text(formatRecordingDuration(recordingDuration))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                }
                .padding(.trailing, DesignTokens.Spacing.base)
            }
            .padding(.top, DesignTokens.Spacing.base)
            Spacer()
        }
    }

    // MARK: - Download Button

    var playerDownloadButton: some View {
        let existing = downloadManager.downloads.first(where: { $0.contentId == contentId })
        let isDownloaded = existing?.status == .completed
        let isDownloading = existing?.status == .downloading || existing?.status == .queued
        return Button {
            guard !isDownloaded, !isDownloading else { return }
            Task {
                await downloadManager.startDownload(DownloadRequest(
                    contentId: contentId,
                    title: viewModel.title ?? "",
                    thumbnail: viewModel.artworkURL?.absoluteString,
                    contentType: contentType,
                    streamUrl: viewModel.currentStreamURL?.absoluteString
                ))
            }
        } label: {
            Image(systemName: isDownloaded ? "checkmark.circle.fill" : (isDownloading ? "arrow.down.circle.fill" : "arrow.down.circle"))
                .font(.system(size: 18))
                .foregroundStyle(isDownloaded ? .green : (isDownloading ? DesignTokens.Primary.p400 : .white))
                .frame(width: 44, height: 44)
        }
        .disabled(isDownloaded || isDownloading)
    }

    // MARK: - Recording Logic

    func startRecording() async {
        guard let user = authManager.user,
              user.subscriptionTier.isPremium || user.role.isAdmin
        else {
            recordingErrorMessage = localization.t("player.premiumRequired")
            showRecordingError = true
            return
        }

        guard mediaContentType.isLive else {
            recordingErrorMessage = localization.t("player.recordingLiveOnly")
            showRecordingError = true
            return
        }

        do {
            let request = RecordingStartRequest(
                channelId: contentId,
                programId: nil,
                duration: nil
            )
            let response = try await repositories.user.startRecording(request: request)

            if let sessionId = response.recordingId {
                isRecording = true
                recordingSessionId = sessionId
                recordingStartTime = Date()
                startRecordingTimer()
            } else {
                recordingErrorMessage = response.message ?? "Failed to start recording"
                showRecordingError = true
            }

        } catch {
            recordingErrorMessage = "Failed to start recording: \(error.localizedDescription)"
            showRecordingError = true
        }
    }

    func stopRecording() async {
        guard let sessionId = recordingSessionId else { return }

        do {
            _ = try await repositories.user.stopRecording(recordingId: sessionId)

            isRecording = false
            recordingSessionId = nil
            recordingStartTime = nil
            recordingDuration = 0
            recordingTimer?.cancel()

        } catch {
            recordingErrorMessage = "Failed to stop recording: \(error.localizedDescription)"
            showRecordingError = true
        }
    }

    func startRecordingTimer() {
        recordingTimer = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                if let startTime = recordingStartTime {
                    await MainActor.run {
                        recordingDuration = Date().timeIntervalSince(startTime)
                    }
                }
            }
        }
    }

    func formatRecordingDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}
