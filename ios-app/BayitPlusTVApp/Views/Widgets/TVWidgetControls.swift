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
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: iconName)
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(badgeColor)
                        .frame(width: 40, height: 40)
                        .background(badgeColor.opacity(0.15))
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 3) {
                        Text(widget.title)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        if let contentType = widget.content?.contentType {
                            Text(contentType.displayLabel)
                                .font(.system(size: TVDesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()
                }

                if let desc = widget.description, !desc.isEmpty {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }

                TVWidgetPlaybackControls(
                    widget: widget,
                    playerVM: $playerVM,
                    localization: localization,
                    badgeColor: badgeColor
                )
            }
            .padding(TVDesignTokens.Spacing.lg)
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
                .frame(width: 52, height: 52)
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
