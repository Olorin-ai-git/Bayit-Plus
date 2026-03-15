#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - Info Section with Playback Controls

    struct TVWidgetInfoSection: View {
        let widget: WidgetItem
        @Binding var playerVM: WidgetPlayerViewModel?
        let localization: LocalizationManager

        private var iconName: String {
            widget.content?.contentType?.iconName ?? "square.grid.2x2"
        }

        private var badgeColor: Color {
            widgetBadgeColor(for: widget)
        }

        var body: some View {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: iconName)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(badgeColor)
                        .frame(width: 32, height: 32)
                        .background(badgeColor.opacity(0.15))
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text(widget.title)
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        if let contentType = widget.content?.contentType {
                            Text(contentType.displayLabel)
                                .font(.system(size: TVDesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()
                }

                TVWidgetPlaybackControls(
                    widget: widget,
                    playerVM: $playerVM,
                    localization: localization,
                    badgeColor: badgeColor
                )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Inline Playback Controls

    struct TVWidgetPlaybackControls: View {
        let widget: WidgetItem
        @Binding var playerVM: WidgetPlayerViewModel?
        let localization: LocalizationManager
        let badgeColor: Color

        var body: some View {
            let isPlaying = playerVM?.isPlaying == true
            let isLoading = playerVM?.isLoading == true
            let hasContent = playerVM?.player.state != .idle

            if hasContent {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    widgetControlButton(
                        icon: isLoading ? nil : (isPlaying ? "pause.fill" : "play.fill"),
                        isLoading: isLoading,
                        tint: badgeColor,
                        label: isLoading ? "Loading" : isPlaying ? "Pause" : "Resume"
                    ) {
                        Task { await playerVM?.togglePlayback(widget: widget) }
                    }

                    widgetControlButton(
                        icon: playerVM?.isMuted == true ? "speaker.slash.fill" : "speaker.wave.2.fill",
                        label: playerVM?.isMuted == true ? "Unmute" : "Mute"
                    ) {
                        playerVM?.toggleMute()
                    }

                    widgetControlButton(
                        icon: "arrow.counterclockwise",
                        label: "Restart"
                    ) {
                        playerVM?.cleanup()
                        Task { await playerVM?.togglePlayback(widget: widget) }
                    }

                    widgetControlButton(
                        icon: "stop.fill",
                        label: "Stop"
                    ) {
                        playerVM?.cleanup()
                    }
                }
            } else {
                Button {
                    Task { await playerVM?.togglePlayback(widget: widget) }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 20))

                        Text(localization.t("player.play"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: TVDesignTokens.MinSize.focusableHeight + 8)
                    .background(
                        LinearGradient(
                            colors: [
                                badgeColor.opacity(0.6),
                                badgeColor.opacity(0.35),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                            .stroke(badgeColor.opacity(0.4), lineWidth: 1)
                    )
                }
                .buttonStyle(WidgetCompactButtonStyle())
                .accessibilityLabel("Play \(widget.title)")

                if let errorMsg = playerVM?.errorMessage {
                    Text(errorMsg)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Warning.default)
                        .lineLimit(1)
                }
            }
        }

        private func widgetControlButton(
            icon: String? = nil,
            isLoading: Bool = false,
            tint: Color? = nil,
            label: String,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                ZStack {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.8)
                    } else if let icon {
                        Image(systemName: icon)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(.white)
                    }
                }
                .frame(width: 44, height: 44)
                .background(tint?.opacity(0.4) ?? Color.white.opacity(0.1))
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
            }
            .buttonStyle(WidgetCompactButtonStyle())
            .accessibilityLabel(label)
        }
    }

#endif
