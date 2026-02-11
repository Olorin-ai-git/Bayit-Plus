#if os(tvOS)
import AVFoundation
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Widget card for the tvOS sidebar with poster art resolved from APIs,
/// content details, and inline playback controls. Glassmorphic design for 10-foot UI.
/// Custom widgets (e.g. Ynet Mivzakim) render their own content instead of poster+play.
struct TVWidgetContainerView: View {

    let widget: WidgetItem
    let onMinimize: () -> Void

    @Environment(TVRepositoryProvider.self) private var repos
    @State private var playerVM: WidgetPlayerViewModel?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isYnetWidget {
                ynetWidgetContent
            } else {
                posterSection
                infoSection
            }
        }
        .background {
            ZStack {
                Color.black.opacity(0.25)
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .fill(.thinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 2)
        )
        .task {
            guard !isYnetWidget else { return }
            if playerVM == nil {
                playerVM = WidgetPlayerViewModel(
                    mediaRepo: repos.media,
                    contentRepo: repos.content,
                    liveTVRepo: repos.liveTV,
                    radioRepo: repos.radio,
                    podcastRepo: repos.podcasts
                )
            }
            await playerVM?.resolveCover(for: widget)
        }
    }

    // MARK: - Ynet Widget Detection

    private var isYnetWidget: Bool {
        let componentName = widget.content?.componentName ?? ""
        return componentName == "ynet_mivzakim"
            || widget.title.contains("Ynet")
            || widget.title.contains("\u{05DE}\u{05D1}\u{05D6}\u{05E7}\u{05D9}")
    }

    // MARK: - Ynet Custom Content

    private var ynetWidgetContent: some View {
        VStack(spacing: 0) {
            // Minimize bar
            HStack {
                Image(systemName: "newspaper")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.red)

                Text(widget.title)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Spacer()

                minimizeButton
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)

            TVYnetMivzakimContentView()
                .frame(maxHeight: 320)
        }
    }

    // MARK: - Poster Section

    private var posterSection: some View {
        ZStack {
            if hasVideoActive {
                InlineAVPlayerLayerView(player: playerVM!.player.avPlayer)
                    .accessibilityLabel("Video: \(widget.title)")
            } else {
                posterImage
            }

            VStack {
                HStack {
                    statusBadge
                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.md)

                Spacer()

                HStack {
                    Spacer()
                    minimizeButton
                }
                .padding(TVDesignTokens.Spacing.md)
            }
        }
        .frame(height: posterHeight)
        .frame(maxWidth: .infinity)
        .clipped()
    }

    @ViewBuilder
    private var posterImage: some View {
        if let url = playerVM?.resolvedCoverURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: posterHeight)
                default:
                    posterFallback
                }
            }
        } else if let urlStr = widget.coverUrl, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: posterHeight)
                default:
                    posterFallback
                }
            }
        } else {
            posterFallback
        }
    }

    private var posterFallback: some View {
        ZStack {
            LinearGradient(
                colors: [
                    badgeColor.opacity(0.25),
                    badgeColor.opacity(0.08),
                    Color.black.opacity(0.3),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: iconName)
                    .font(.system(size: 52, weight: .light))
                    .foregroundStyle(badgeColor.opacity(0.7))

                Text(widget.content?.contentType?.displayLabel ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .frame(maxWidth: .infinity, minHeight: posterHeight)
    }

    @ViewBuilder
    private var statusBadge: some View {
        let contentType = widget.content?.contentType
        switch contentType {
        case .liveChannel, .live:
            liveBadge(text: "LIVE")
        case .radio:
            liveBadge(text: "ON AIR")
        default:
            EmptyView()
        }
    }

    private func liveBadge(text: String) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(Color.red)
                .frame(width: 8, height: 8)
            Text(text)
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.sm)
        .padding(.vertical, 6)
        .background(Color.red.opacity(0.65))
        .background(.thinMaterial)
        .environment(\.colorScheme, .dark)
        .clipShape(Capsule())
    }

    // MARK: - Minimize Button (shared)

    private var minimizeButton: some View {
        Button { onMinimize() } label: {
            Image(systemName: "arrow.down.right.and.arrow.up.left")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 48, height: 48)
                .background(.thinMaterial)
                .environment(\.colorScheme, .dark)
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        }
        .buttonStyle(WidgetCompactButtonStyle())
        .accessibilityLabel("Minimize \(widget.title)")
    }

    // MARK: - Info Section

    private var infoSection: some View {
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

            playbackControls
        }
        .padding(TVDesignTokens.Spacing.lg)
    }

    // MARK: - Inline Playback Controls

    @ViewBuilder
    private var playbackControls: some View {
        let isPlaying = playerVM?.isPlaying == true
        let isLoading = playerVM?.isLoading == true
        let hasContent = playerVM?.player.state != .idle

        if hasContent {
            // Active playback: uniform icon buttons
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                controlButton(
                    icon: isLoading ? nil : (isPlaying ? "pause.fill" : "play.fill"),
                    isLoading: isLoading,
                    tint: badgeColor,
                    label: isLoading ? "Loading" : isPlaying ? "Pause" : "Resume"
                ) {
                    Task { await playerVM?.togglePlayback(widget: widget) }
                }

                controlButton(
                    icon: playerVM?.isMuted == true ? "speaker.slash.fill" : "speaker.wave.2.fill",
                    label: playerVM?.isMuted == true ? "Unmute" : "Mute"
                ) {
                    playerVM?.toggleMute()
                }

                controlButton(
                    icon: "arrow.counterclockwise",
                    label: "Restart"
                ) {
                    playerVM?.cleanup()
                    Task { await playerVM?.togglePlayback(widget: widget) }
                }

                controlButton(
                    icon: "stop.fill",
                    label: "Stop"
                ) {
                    playerVM?.cleanup()
                }
            }
        } else {
            // Idle: show play button that starts in-place streaming
            Button {
                Task { await playerVM?.togglePlayback(widget: widget) }
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 20))

                    Text("Play")
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

    // MARK: - Control Button

    private func controlButton(
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

    // MARK: - Helpers

    private var posterHeight: CGFloat {
        switch widget.content?.contentType {
        case .liveChannel, .live, .vod:
            return 200
        case .radio, .podcast, .audiobook:
            return 140
        default:
            return 140
        }
    }

    private var isVideoContent: Bool {
        let ct = widget.content?.contentType
        return ct == .liveChannel || ct == .live || ct == .vod
    }

    private var hasVideoActive: Bool {
        guard isVideoContent, let vm = playerVM else { return false }
        return vm.player.state != .idle
    }

    private var iconName: String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    private var badgeColor: Color {
        switch widget.content?.contentType {
        case .liveChannel, .live: return DesignTokens.Primary.p400
        case .radio: return DesignTokens.Warning.default
        case .podcast: return DesignTokens.Success.default
        case .vod, .audiobook: return DesignTokens.Primary.p300
        case .iframe: return DesignTokens.Text.secondary
        default: return DesignTokens.Text.muted
        }
    }
}

// MARK: - Widget Compact Button Style

/// Lightweight focus style for widget sidebar buttons.
/// Uses minimal scale (1.03) and a subtle purple ring instead of the
/// default `.card` + `.tvFocusStyle()` combination which double-scales.
private struct WidgetCompactButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        WidgetCompactButtonBody(
            configuration: configuration,
            isPressed: configuration.isPressed
        )
    }
}

private struct WidgetCompactButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let isPressed: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        configuration.label
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: 2
                    )
            )
            .scaleEffect(isFocused ? 1.03 : 1.0)
            .scaleEffect(isPressed ? 0.96 : 1.0)
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.4)
                    : Color.clear,
                radius: 8,
                x: 0,
                y: isFocused ? 4 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.1), value: isPressed)
    }
}

// MARK: - Inline AVPlayer Layer

/// Lightweight UIViewRepresentable rendering AVPlayerLayer directly.
/// Used for inline widget video playback without native transport controls.
private struct InlineAVPlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerLayerUIView {
        let view = PlayerLayerUIView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspectFill
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: PlayerLayerUIView, context: Context) {
        if uiView.playerLayer.player !== player {
            uiView.playerLayer.player = player
        }
    }

    final class PlayerLayerUIView: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    }
}
#endif
