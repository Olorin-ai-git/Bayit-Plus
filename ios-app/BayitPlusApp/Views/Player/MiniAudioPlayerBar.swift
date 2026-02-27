import BayitDesignSystem
import SwiftUI

/// Compact glass-styled bar that appears above the tab bar when inline audio is playing.
///
/// Displays artwork thumbnail, title/subtitle, play/pause, and close controls.
/// Hides when the fullscreen player is active.
struct MiniAudioPlayerBar: View {
    @Environment(AudioPlaybackManager.self) var audioManager
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var showSleepTimerPicker = false
    @State private var showChapterPicker = false

    var body: some View {
        if audioManager.isActive, coordinator.fullscreenRoute == nil {
            barContent
                .transition(.asymmetric(
                    insertion: .move(edge: .bottom).combined(with: .opacity),
                    removal: .move(edge: .bottom).combined(with: .opacity)
                ))
        }
    }

    private var barContent: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            closeButton

            artworkThumbnail
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 4)

            VStack(spacing: 4) {
                Text(audioManager.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let subtitle = audioManager.subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }

            if audioManager.sleepTimerManager.isActive, !isLiveContent {
                SleepTimerBanner(
                    remainingSeconds: audioManager.sleepTimerManager.remainingSeconds,
                    onExtend: { minutes in audioManager.extendSleepTimer(minutes: minutes) },
                    onCancel: { audioManager.cancelSleepTimer() }
                )
            }

            progressBar

            playbackControls
        }
        .padding(DesignTokens.Spacing.lg)
        .sheet(isPresented: $showSleepTimerPicker) {
            SleepTimerPicker(
                activeDuration: audioManager.sleepTimerManager.selectedDurationMinutes,
                timerOptions: audioManager.sleepTimerManager.timerOptions,
                onSelect: { minutes in
                    audioManager.startSleepTimer(minutes: minutes)
                    showSleepTimerPicker = false
                },
                onCancel: {
                    if audioManager.sleepTimerManager.isActive {
                        audioManager.cancelSleepTimer()
                    }
                    showSleepTimerPicker = false
                }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showChapterPicker) {
            ChapterPickerSheet(
                chapters: audioManager.activeChapters,
                currentIndex: audioManager.currentChapterIndex,
                onSelect: { chapter in
                    audioManager.playChapter(chapter)
                    showChapterPicker = false
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .background(
            ZStack {
                Color.black.opacity(0.3)
                VisualEffectBlur(style: .systemUltraThinMaterialDark)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.default.opacity(0.2),
                            DesignTokens.Glass.border.opacity(0.3),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: .black.opacity(0.5), radius: 20, x: 0, y: 10)
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    private var closeButton: some View {
        HStack {
            Button {
                audioManager.stop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 30, height: 30)
            }
            .accessibilityLabel("Close player")

            Spacer()

            if audioManager.activeContentType == .audiobook && !audioManager.activeChapters.isEmpty {
                Button {
                    showChapterPicker = true
                } label: {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.muted)
                        .frame(width: 30, height: 30)
                }
                .accessibilityLabel("Chapters")
            }

            if !isLiveContent {
                Button {
                    showSleepTimerPicker = true
                } label: {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(
                            audioManager.sleepTimerManager.isActive
                                ? DesignTokens.Primary.default
                                : DesignTokens.Text.muted
                        )
                        .frame(width: 30, height: 30)
                }
                .accessibilityLabel("Sleep timer")
            }
        }
    }

    private var isLiveContent: Bool {
        audioManager.activeContentType == .radio || audioManager.activeContentType == .live || audioManager.activeContentType == .liveTV
    }
}
