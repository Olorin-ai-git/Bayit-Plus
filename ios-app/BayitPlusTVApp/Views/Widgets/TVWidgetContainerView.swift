#if os(tvOS)
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Widget card for the tvOS sidebar with poster art resolved from APIs,
/// content details, and playback controls. Glassmorphic design for 10-foot UI.
struct TVWidgetContainerView: View {

    let widget: WidgetItem
    let onMinimize: () -> Void
    let onPlay: () -> Void

    @Environment(TVRepositoryProvider.self) private var repos
    @State private var playerVM: WidgetPlayerViewModel?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            posterSection
            infoSection
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
                .stroke(
                    DesignTokens.Glass.border,
                    lineWidth: 2
                )
        )
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
    }

    // MARK: - Poster Section

    private var posterSection: some View {
        ZStack {
            posterImage

            // Overlays
            VStack {
                // Status badge top-left
                HStack {
                    statusBadge
                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.md)

                Spacer()

                // Bottom bar: minimize button
                HStack {
                    Spacer()
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
                    .buttonStyle(.card)
                    .tvFocusStyle()
                    .accessibilityLabel("Minimize \(widget.title)")
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

    // MARK: - Info Section

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            // Title row with type icon
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

            // Description
            if let desc = widget.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }

            // Play button
            Button { onPlay() } label: {
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
            .buttonStyle(.card)
            .tvFocusStyle()
            .accessibilityLabel("Play \(widget.title)")
        }
        .padding(TVDesignTokens.Spacing.lg)
    }

    // MARK: - Helpers

    private var posterHeight: CGFloat {
        switch widget.content?.contentType {
        case .liveChannel, .live, .vod:
            return 160
        case .radio, .podcast, .audiobook:
            return 140
        default:
            return 140
        }
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
#endif
