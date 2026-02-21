#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - Ynet Custom Content

    struct TVWidgetYnetContent: View {
        let widget: WidgetItem
        let onMinimize: () -> Void

        var body: some View {
            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "newspaper")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.red)

                    Text(widget.title)
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()

                    TVWidgetMinimizeButton(title: widget.title, onMinimize: onMinimize)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)

                TVYnetMivzakimContentView()
                    .frame(maxHeight: 320)
            }
        }
    }

    // MARK: - Poster Section

    struct TVWidgetPosterSection: View {
        let widget: WidgetItem
        let playerVM: WidgetPlayerViewModel?
        let onMinimize: () -> Void

        private var isVideoContent: Bool {
            let ct = widget.content?.contentType
            return ct == .liveChannel || ct == .live || ct == .vod
        }

        private var hasVideoActive: Bool {
            guard isVideoContent, let vm = playerVM else { return false }
            return vm.player.state != .idle
        }

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

        private var badgeColor: Color {
            widgetBadgeColor(for: widget)
        }

        private var iconName: String {
            widget.content?.contentType?.iconName ?? "square.grid.2x2"
        }

        var body: some View {
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
                        TVWidgetMinimizeButton(title: widget.title, onMinimize: onMinimize)
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
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: posterHeight)
                    default:
                        posterFallback
                    }
                }
            } else if let urlStr = widget.coverUrl, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
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
    }

#endif
