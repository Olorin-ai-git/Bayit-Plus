import SwiftUI

/// SF Symbol name used as placeholder when a thumbnail is missing
public enum ContentPlaceholderIcon: String, Sendable {
    case movie = "film"
    case series = "tv"
    case podcast = "mic.fill"
    case audiobook = "headphones"
    case radio
    case live = "antenna.radiowaves.left.and.right"
    case general = "photo"
}

/// Content card for movies, series, podcasts with thumbnail and metadata.
/// Features glass overlay, optional badge, subtitle language flags, tap interaction,
/// and optional playlist/widget action buttons.
public struct GlassContentCard: View {
    let thumbnailURL: String?
    let title: String?
    let subtitle: String?
    let badge: String?
    let subtitleFlags: [String]?
    let aspectRatio: CGFloat
    let width: CGFloat
    let placeholderIcon: ContentPlaceholderIcon
    let onTap: () -> Void

    // Action button state
    let isInPlaylist: Bool
    let isWidget: Bool
    let isActionsLoading: Bool
    let onPlaylistToggle: (() -> Void)?
    let onWidgetToggle: (() -> Void)?

    /// Maximum number of flags displayed before showing "+N" overflow
    private let maxVisibleFlags = 5

    /// Fixed height derived from width and aspect ratio for consistent card sizing
    private var cardHeight: CGFloat {
        width / aspectRatio
    }

    public init(
        thumbnailURL: String?,
        title: String?,
        subtitle: String? = nil,
        badge: String? = nil,
        subtitleFlags: [String]? = nil,
        aspectRatio: CGFloat = 16 / 9,
        width: CGFloat = 280,
        placeholderIcon: ContentPlaceholderIcon = .general,
        isInPlaylist: Bool = false,
        isWidget: Bool = false,
        isActionsLoading: Bool = false,
        onPlaylistToggle: (() -> Void)? = nil,
        onWidgetToggle: (() -> Void)? = nil,
        onTap: @escaping () -> Void = {}
    ) {
        self.thumbnailURL = thumbnailURL
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.subtitleFlags = subtitleFlags
        self.aspectRatio = aspectRatio
        self.width = width
        self.placeholderIcon = placeholderIcon
        self.isInPlaylist = isInPlaylist
        self.isWidget = isWidget
        self.isActionsLoading = isActionsLoading
        self.onPlaylistToggle = onPlaylistToggle
        self.onWidgetToggle = onWidgetToggle
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            thumbnailSection
                .frame(width: width, height: cardHeight)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .shadow(
                    color: DesignTokens.Glass.purpleGlow,
                    radius: 4,
                    x: 0,
                    y: 2
                )
        }
        .buttonStyle(ScaleButtonStyle())
    }

    private var thumbnailSection: some View {
        ZStack(alignment: .topTrailing) {
            thumbnailImage

            if let badge = badge {
                badgeView(badge)
                    .padding(DesignTokens.Spacing.sm)
            }

            if let flags = subtitleFlags, !flags.isEmpty {
                subtitleFlagsOverlay(flags)
            }

            // Action buttons (top-left)
            if onPlaylistToggle != nil || onWidgetToggle != nil {
                VStack {
                    actionButtons
                    Spacer()
                }
            }

            VStack {
                Spacer()
                metadataOverlay
            }
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            if let onPlaylistToggle {
                cardActionButton(
                    icon: isInPlaylist ? "bookmark.fill" : "bookmark",
                    isActive: isInPlaylist,
                    activeColor: DesignTokens.Primary.p400,
                    action: onPlaylistToggle,
                    label: isInPlaylist ? "Remove from playlist" : "Add to playlist"
                )
            }

            if let onWidgetToggle {
                cardActionButton(
                    icon: isWidget ? "checkmark.square.fill" : "square.grid.2x2",
                    isActive: isWidget,
                    activeColor: DesignTokens.Colors.Semantic.success,
                    action: onWidgetToggle,
                    label: isWidget ? "Remove widget" : "Add as widget"
                )
            }
        }
        .padding(DesignTokens.Spacing.sm)
        .opacity(isActionsLoading ? 0.5 : 1.0)
    }

    private func cardActionButton(
        icon: String, isActive: Bool, activeColor: Color,
        action: @escaping () -> Void, label: String
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: width <= 160 ? 12 : 14, weight: .medium))
                .foregroundStyle(isActive ? activeColor : DesignTokens.Text.primary)
                .frame(width: width <= 160 ? 26 : 32, height: width <= 160 ? 26 : 32)
                .background(
                    Color.adaptive(
                        light: { PlatformColor.white.withAlphaComponent(0.8) },
                        dark: { PlatformColor.black.withAlphaComponent(0.6) }
                    )
                )
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(
                        isActive ? activeColor.opacity(0.5) : DesignTokens.Glass.border,
                        lineWidth: 1
                    )
                )
        }
        .buttonStyle(.plain)
        #if os(tvOS)
            .focusEffectDisabled()
        #endif
            .disabled(isActionsLoading)
            .accessibilityLabel(label)
    }

    private func subtitleFlagsOverlay(_ flags: [String]) -> some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                subtitleFlagsPill(flags)
                    .padding(DesignTokens.Spacing.xs)
            }
        }
        .padding(.bottom, metadataHeight)
    }

    private func subtitleFlagsPill(_ flags: [String]) -> some View {
        HStack(spacing: 2) {
            let visible = Array(flags.prefix(maxVisibleFlags))
            ForEach(visible, id: \.self) { flag in
                Text(flag)
                    .font(.system(size: DesignTokens.FontSize.xs))
            }
            if flags.count > maxVisibleFlags {
                Text("+\(flags.count - maxVisibleFlags)")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xs)
        .padding(.vertical, 2)
        .background(DesignTokens.Glass.bg)
        .clipShape(Capsule())
    }

    /// Estimated metadata overlay height for flag positioning above it
    private var metadataHeight: CGFloat {
        (title != nil || subtitle != nil)
            ? (metadataPadding * 2 + titleFontSize + DesignTokens.Spacing.xs)
            : 0
    }

    private var thumbnailImage: some View {
        Group {
            if let urlString = thumbnailURL, let url = URL(string: urlString) {
                CachedAsyncImage(url: url) {
                    placeholderGradient
                }
            } else {
                placeholderGradient
            }
        }
    }

    private var placeholderGradient: some View {
        ZStack {
            LinearGradient(
                colors: [
                    DesignTokens.Glass.purpleLight,
                    DesignTokens.Glass.purpleStrong,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: placeholderIcon.rawValue)
                .font(.system(size: width * 0.25, weight: .thin))
                .foregroundStyle(
                    .linearGradient(
                        colors: [
                            Color.white.opacity(0.25),
                            Color.white.opacity(0.08),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
        }
    }

    private func badgeView(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background {
                ZStack {
                    badgeColor(for: text)
                    VisualEffectBlur()
                }
            }
            .clipShape(Capsule())
    }

    private func badgeColor(for text: String) -> Color {
        if text.uppercased() == "LIVE" {
            return DesignTokens.live.opacity(0.9)
        } else {
            return DesignTokens.Glass.bg
        }
    }

    /// Padding adjusts for narrow cards (<=160pt) to maximize text space
    private var metadataPadding: CGFloat {
        width <= 160 ? DesignTokens.Spacing.sm : DesignTokens.Spacing.md
    }

    /// Font sizes scale down for narrow cards to prevent label clipping
    private var titleFontSize: CGFloat {
        width <= 160 ? DesignTokens.FontSize.sm : DesignTokens.FontSize.md
    }

    private var subtitleFontSize: CGFloat {
        width <= 160 ? DesignTokens.FontSize.xs : DesignTokens.FontSize.sm
    }

    private var metadataOverlay: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            if let title = title {
                Text(title)
                    .font(.system(size: titleFontSize, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .truncationMode(.tail)
                    .multilineTextAlignment(.leading)
            }

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.system(size: subtitleFontSize))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(metadataPadding)
        .background {
            ZStack {
                DesignTokens.Glass.bgStrong
                VisualEffectBlur()
            }
        }
    }
}

private struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}
