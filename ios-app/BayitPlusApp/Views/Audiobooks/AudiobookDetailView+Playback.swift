import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Playback Controls & Progress

extension AudiobookDetailView {
    func playbackControls(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            progressBar(audiobook, vm: vm)
            transportBar(audiobook, vm: vm)
            speedPicker(vm: vm)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Progress Bar

    private func progressBar(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        let playing = isAudiobookPlaying(audiobook)
        let current = playing ? audioManager.currentTime : vm.savedPosition
        let total = playing ? audioManager.duration : 0
        let hasProgress = playing ? total > 0 : vm.savedProgress > 0

        return VStack(spacing: DesignTokens.Spacing.xs) {
            if hasProgress {
                progressSlider(current: current, total: total, isLive: playing, savedPercent: vm.savedProgress)
                progressTimeLabels(current: current, total: total, isLive: playing, savedPercent: vm.savedProgress)
            }
        }
    }

    private func progressSlider(
        current: TimeInterval,
        total: TimeInterval,
        isLive: Bool,
        savedPercent: Double
    ) -> some View {
        GeometryReader { geo in
            let fraction = isLive ? (total > 0 ? current / total : 0) : savedPercent / 100
            let width = geo.size.width

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: 4)

                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: width * CGFloat(min(max(fraction, 0), 1)), height: 4)
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onEnded { value in
                        guard isLive, total > 0 else { return }
                        let percent = max(0, min(value.location.x / width, 1))
                        let seekTime = Double(percent) * total
                        Task {
                            await audioManager.mediaPlayer.seek(to: seekTime)
                            audioManager.updateNowPlayingPosition()
                        }
                    }
            )
        }
        .frame(height: 4)
    }

    private func progressTimeLabels(
        current: TimeInterval,
        total: TimeInterval,
        isLive: Bool,
        savedPercent: Double
    ) -> some View {
        HStack {
            if isLive, total > 0 {
                Text(formatDuration(current))
                Spacer()
                Text("-\(formatDuration(max(0, total - current)))")
            } else {
                Text("\(Int(savedPercent))%")
                Spacer()
            }
        }
        .font(.system(size: DesignTokens.FontSize.xs))
        .foregroundColor(DesignTokens.Text.muted)
    }

    func formatDuration(_ time: TimeInterval) -> String {
        let total = Int(time)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Transport Bar

    private func transportBar(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        let playing = isAudiobookPlaying(audiobook)
        let canPrev = vm.canGoPreviousChapter(audioManager: audioManager, audiobook: audiobook)
        let canNext = vm.canGoNextChapter(audioManager: audioManager, audiobook: audiobook)

        return HStack(spacing: DesignTokens.Spacing.lg) {
            transportButton(icon: "backward.end.fill", size: 22, disabled: !canPrev) {
                skipToPreviousChapter(audiobook, vm: vm)
            }

            transportButton(icon: "gobackward.15", size: 28) {
                skipBackward(audiobook)
            }

            transportButton(
                icon: playing ? "pause.circle.fill" : "play.circle.fill",
                size: 48
            ) {
                playAudiobook(audiobook, vm: vm)
            }

            transportButton(icon: "goforward.30", size: 28) {
                skipForward(audiobook)
            }

            transportButton(icon: "forward.end.fill", size: 22, disabled: !canNext) {
                skipToNextChapter(audiobook, vm: vm)
            }
        }
    }

    func transportButton(
        icon: String,
        size: CGFloat,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            action()
        } label: {
            Image(systemName: icon)
                .font(.system(size: size))
                .foregroundColor(
                    disabled ? DesignTokens.Text.muted : DesignTokens.Primary.default
                )
        }
        .disabled(disabled)
    }

    // MARK: - Speed Picker

    private func speedPicker(vm: AudiobookDetailViewModel) -> some View {
        PlaybackSpeedControlView(currentSpeed: vm.playbackSpeed) { speed in
            audioManager.mediaPlayer.setRate(speed)
            vm.setSpeed(speed)
        }
    }
}
