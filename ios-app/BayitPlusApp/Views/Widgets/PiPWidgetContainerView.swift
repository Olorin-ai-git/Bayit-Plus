import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Floating widget container that renders actual widget content.
/// Matches the web WidgetContainer layout: header bar with title/buttons + content area.
/// Supports drag repositioning via gesture.
struct PiPWidgetContainerView: View {
    let widget: WidgetItem
    let onMinimize: () -> Void
    let onClose: () -> Void

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    @State private var playerVM: WidgetPlayerViewModel?
    @State private var position: CGSize = .zero
    @State private var lastPosition: CGSize = .zero

    private let containerWidth: CGFloat = 340
    private let headerHeight: CGFloat = 40

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            contentArea
        }
        .frame(width: containerWidth)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
        .offset(x: position.width, y: position.height)
        .gesture(dragGesture)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(.trailing, DesignTokens.Spacing.base)
        .padding(.top, 100)
        .transition(.scale.combined(with: .opacity))
        .animation(.spring(duration: 0.3, bounce: 0.15), value: position)
        .task {
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
        .onDisappear {
            playerVM?.cleanup()
        }
    }

    // MARK: - Header Bar

    private var headerBar: some View {
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

    private var controlButtons: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            // Minimize button
            headerButton(icon: "arrow.down.right.and.arrow.up.left") {
                HapticFeedbackService.impact(style: .light)
                onMinimize()
            }

            // Mute/unmute button
            headerButton(
                icon: playerVM?.isMuted == true ? "speaker.slash.fill" : "speaker.wave.2.fill"
            ) {
                HapticFeedbackService.impact(style: .light)
                playerVM?.toggleMute()
            }

            // Close button
            headerButton(icon: "xmark") {
                HapticFeedbackService.impact(style: .light)
                onClose()
            }
        }
    }

    private func headerButton(icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 26, height: 26)
                .background(Color.white.opacity(0.1))
                .clipShape(Circle())
        }
    }

    private var titleSection: some View {
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

    // MARK: - Content Area

    @ViewBuilder
    private var contentArea: some View {
        let contentType = widget.content?.contentType
        Group {
            switch contentType {
            case .liveChannel, .live:
                liveContentView
            case .radio:
                radioContentView
            case .podcast:
                podcastContentView
            case .vod:
                vodContentView
            case .iframe:
                iframeContentView
            case .audiobook:
                audiobookContentView
            case .custom:
                customContentView
            case nil:
                placeholderView
            }
        }
        .frame(height: contentHeight(for: contentType))
        .background(Color.black.opacity(0.85))
        .background(.ultraThinMaterial.opacity(0.3))
    }

    private func contentHeight(for type: WidgetContentType?) -> CGFloat {
        switch type {
        case .liveChannel, .live, .vod:
            return 200
        case .radio, .podcast, .audiobook:
            return 140
        case .iframe, .custom:
            return 220
        case nil:
            return 120
        }
    }

    // MARK: - Content Type Views

    private var liveContentView: some View {
        ZStack {
            coverImage(fallbackIcon: "tv")

            VStack {
                // Live indicator
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(DesignTokens.live)
                        .frame(width: 8, height: 8)
                    Text("LIVE")
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.live)
                    Spacer()
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.top, DesignTokens.Spacing.sm)

                Spacer()
                playButtonOverlay
                Spacer()

                Text(widget.description ?? localization.t("widgets.liveTVStream"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.8), radius: 2)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.bottom, DesignTokens.Spacing.sm)
            }
        }
    }

    private var radioContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "radio", fallbackColor: DesignTokens.Colors.Semantic.warning)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(widget.title)
                        .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(widget.description ?? localization.t("widgets.radioStation"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)

                    HStack(spacing: 4) {
                        Circle()
                            .fill(DesignTokens.live)
                            .frame(width: 6, height: 6)
                        Text("LIVE")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(DesignTokens.live)
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)

            // Compact transport controls
            compactTransportControls
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.bottom, DesignTokens.Spacing.sm)
        }
    }

    private var podcastContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "mic.fill", fallbackColor: DesignTokens.Colors.Semantic.success)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(widget.title)
                        .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(widget.description ?? localization.t("widgets.podcastEpisode"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)

            compactTransportControls
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.bottom, DesignTokens.Spacing.sm)
        }
    }

    private var vodContentView: some View {
        VStack(spacing: 0) {
            ZStack {
                coverImage(fallbackIcon: "film")
                playButtonOverlay
            }
            .frame(height: 160)
            .clipped()

            // Title bar
            HStack {
                Text(widget.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Spacer()

                if let desc = widget.description {
                    Text(desc)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private var audiobookContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "book.fill", fallbackColor: DesignTokens.Colors.Semantic.info)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(widget.title)
                        .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(widget.description ?? localization.t("widgets.audiobook"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)

            compactTransportControls
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.bottom, DesignTokens.Spacing.sm)
        }
    }

    private var iframeContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Spacer()

            Image(systemName: "globe")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(widget.content?.iframeTitle ?? widget.title)
                .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(localization.t("widgets.webContent"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()
        }
        .padding(DesignTokens.Spacing.md)
    }

    @ViewBuilder
    private var customContentView: some View {
        let componentName = widget.content?.componentName ?? ""
        let isYnet = componentName == "ynet_mivzakim"
            || widget.title.contains("Ynet")
            || widget.title.contains("\u{05DE}\u{05D1}\u{05D6}\u{05E7}\u{05D9}")

        if isYnet {
            YnetMivzakimContentView()
        } else {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Spacer()
                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(widget.title)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                if let name = widget.content?.componentName {
                    Text(name)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private var placeholderView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Spacer()

            Image(systemName: "rectangle.on.rectangle")
                .font(.system(size: 28))
                .foregroundStyle(DesignTokens.Text.disabled)

            Text(localization.t("widgets.noContent"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            Spacer()
        }
    }

    // MARK: - Cover Image Helpers

    private func coverImage(fallbackIcon: String) -> some View {
        Group {
            if let url = playerVM?.resolvedCoverURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        coverFallback(icon: fallbackIcon, size: 32)
                    }
                }
            } else {
                coverFallback(icon: fallbackIcon, size: 32)
            }
        }
    }

    private func coverThumbnail(fallbackIcon: String, fallbackColor: Color) -> some View {
        Group {
            if let url = playerVM?.resolvedCoverURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                    default:
                        thumbnailFallback(icon: fallbackIcon, color: fallbackColor)
                    }
                }
            } else {
                thumbnailFallback(icon: fallbackIcon, color: fallbackColor)
            }
        }
        .frame(width: 56, height: 56)
    }

    private func coverFallback(icon: String, size: CGFloat) -> some View {
        ZStack {
            Color.black
            Image(systemName: icon)
                .font(.system(size: size))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private func thumbnailFallback(icon: String, color: Color) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                .fill(Color.white.opacity(0.1))
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(color)
        }
    }

    // MARK: - Shared Sub-views

    private var playButtonOverlay: some View {
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
                } else {
                    Image(
                        systemName: playerVM?.isPlaying == true ? "pause.fill" : "play.fill"
                    )
                    .font(.system(size: 20))
                    .foregroundStyle(.white)
                }
            }
        }
    }

    private var compactTransportControls: some View {
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

    // MARK: - Drag Gesture

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                position = CGSize(
                    width: lastPosition.width + value.translation.width,
                    height: lastPosition.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastPosition = position
            }
    }
}
