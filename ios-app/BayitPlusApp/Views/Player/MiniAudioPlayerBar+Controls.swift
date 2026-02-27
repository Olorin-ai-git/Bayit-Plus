import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on MiniAudioPlayerBar providing playback controls,
/// progress bar, and artwork thumbnail.
extension MiniAudioPlayerBar {
    // MARK: - Progress Bar

    var progressBar: some View {
        VStack(spacing: 6) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 4)

                    if audioManager.duration > 0 {
                        Capsule()
                            .fill(DesignTokens.Primary.default)
                            .frame(
                                width: geometry.size.width * CGFloat(audioManager.currentTime / audioManager.duration),
                                height: 4
                            )
                    }
                }
            }
            .frame(height: 4)

            HStack {
                Text(formatTime(audioManager.currentTime))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .monospacedDigit()

                Spacer()

                Text("-\(formatTime(max(0, audioManager.duration - audioManager.currentTime)))")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .monospacedDigit()
            }
        }
    }

    // MARK: - Playback Controls

    var playbackControls: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            if audioManager.isLoading {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(width: 44, height: 44)
            } else {
                if audioManager.activeContentType == .audiobook && !audioManager.activeChapters.isEmpty {
                    Button {
                        audioManager.skipToPreviousChapter()
                    } label: {
                        Image(systemName: "backward.end.fill")
                            .font(.system(size: 22, weight: .light))
                            .foregroundColor(
                                audioManager.canGoPreviousChapter
                                    ? DesignTokens.Text.primary
                                    : DesignTokens.Text.muted
                            )
                            .frame(width: 44, height: 44)
                    }
                    .disabled(!audioManager.canGoPreviousChapter)
                    .accessibilityLabel("Previous chapter")
                }

                Button {
                    audioManager.skipBackward(seconds: 15)
                } label: {
                    Image(systemName: "gobackward.15")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Skip backward 15 seconds")

                Button {
                    audioManager.togglePlayPause()
                } label: {
                    Image(systemName: audioManager.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 60, height: 60)
                }
                .accessibilityLabel(audioManager.isPlaying ? "Pause" : "Play")

                Button {
                    audioManager.skipForward(seconds: 30)
                } label: {
                    Image(systemName: "goforward.30")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Skip forward 30 seconds")

                if audioManager.activeContentType == .audiobook && !audioManager.activeChapters.isEmpty {
                    Button {
                        audioManager.skipToNextChapter()
                    } label: {
                        Image(systemName: "forward.end.fill")
                            .font(.system(size: 22, weight: .light))
                            .foregroundColor(
                                audioManager.canGoNextChapter
                                    ? DesignTokens.Text.primary
                                    : DesignTokens.Text.muted
                            )
                            .frame(width: 44, height: 44)
                    }
                    .disabled(!audioManager.canGoNextChapter)
                    .accessibilityLabel("Next chapter")
                }
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Helpers

    func formatTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(time)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    @ViewBuilder
    var artworkThumbnail: some View {
        if let url = audioManager.artworkURL {
            CachedAsyncImage(url: url) {
                artworkPlaceholder
            }
        } else {
            artworkPlaceholder
        }
    }

    var artworkPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: audioManager.activeContentType == .radio ? "radio" : "headphones")
                .font(.system(size: 16))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}

// MARK: - Chapter Picker Sheet

struct ChapterPickerSheet: View {
    @Environment(LocalizationManager.self) private var localization
    let chapters: [AudiobookChapter]
    let currentIndex: Int?
    let onSelect: (AudiobookChapter) -> Void

    var body: some View {
        NavigationStack {
            List(chapters, id: \.stableId) { chapter in
                let index = chapters.firstIndex { $0.stableId == chapter.stableId }
                let isActive = index == currentIndex
                Button {
                    onSelect(chapter)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(chapter.title ?? "Chapter \(chapter.chapterNumber ?? 0)")
                                .font(.system(size: 15, weight: isActive ? .semibold : .regular))
                                .foregroundColor(isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary)
                            if let dur = chapter.duration {
                                Text(dur)
                                    .font(.system(size: 12))
                                    .foregroundColor(DesignTokens.Text.muted)
                            }
                        }
                        Spacer()
                        if isActive {
                            Image(systemName: "speaker.wave.2.fill")
                                .font(.system(size: 14))
                                .foregroundColor(DesignTokens.Primary.default)
                        }
                    }
                }
            }
            .navigationTitle(localization.t("audiobooks.chapters"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
