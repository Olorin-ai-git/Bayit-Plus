import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - PiPWidgetContainerView Header and Control Extensions

extension PiPWidgetContainerView {
    var headerBar: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            controlButtons

            Spacer()

            titleSection
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .frame(height: headerHeight)
        .background(Color.black.opacity(0.7))
        .background(.ultraThinMaterial.opacity(0.5))
    }

    var controlButtons: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            headerButton(icon: "arrow.down.right.and.arrow.up.left") {
                HapticFeedbackService.impact(style: .light)
                onMinimize()
            }

            headerButton(
                icon: playerVM?.isMuted == true ? "speaker.slash.fill" : "speaker.wave.2.fill"
            ) {
                HapticFeedbackService.impact(style: .light)
                playerVM?.toggleMute()
            }

            headerButton(icon: "xmark") {
                HapticFeedbackService.impact(style: .light)
                onClose()
            }
        }
    }

    func headerButton(icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 26, height: 26)
                .background(Color.white.opacity(0.1))
                .clipShape(Circle())
        }
    }

    var titleSection: some View {
        VStack(alignment: .trailing, spacing: 2) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Text(widget.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let iconName = widget.content?.contentType?.iconName {
                    Image(systemName: iconName)
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            if let contentType = widget.content?.contentType {
                Text(contentType.displayLabel)
                    .font(.system(size: 9))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    // MARK: - Playback Controls

    var playButtonOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Button {
                HapticFeedbackService.impact(style: .medium)
                Task { await playerVM?.togglePlayback(widget: widget) }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.5))
                        .frame(width: 48, height: 48)
                        .overlay(
                            Circle().stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )

                    if playerVM?.isLoading == true {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.8)
                    } else if playerVM?.errorMessage != nil {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.Warning.default)
                    } else {
                        Image(
                            systemName: playerVM?.isPlaying == true ? "pause.fill" : "play.fill"
                        )
                        .font(.system(size: 20))
                        .foregroundStyle(.white)
                    }
                }
            }

            if let error = playerVM?.errorMessage {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Warning.default)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                    .shadow(color: .black, radius: 2)
            }
        }
    }

    var compactTransportControls: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            Button {
                HapticFeedbackService.impact(style: .light)
                Task { await playerVM?.skipBackward() }
            } label: {
                Image(systemName: "gobackward.10")
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Button {
                HapticFeedbackService.impact(style: .medium)
                Task { await playerVM?.togglePlayback(widget: widget) }
            } label: {
                if playerVM?.isLoading == true {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.9)
                } else {
                    Image(
                        systemName: playerVM?.isPlaying == true ? "pause.fill" : "play.fill"
                    )
                    .font(.system(size: 28))
                    .foregroundStyle(.white)
                }
            }

            Button {
                HapticFeedbackService.impact(style: .light)
                Task { await playerVM?.skipForward() }
            } label: {
                Image(systemName: "goforward.10")
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Spacer()
        }
    }
}
