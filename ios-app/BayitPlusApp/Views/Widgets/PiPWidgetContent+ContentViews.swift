import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - PiPWidgetContainerView Video Content Views

extension PiPWidgetContainerView {
    var liveContentView: some View {
        ZStack {
            if isVideoActive {
                InlineAVPlayerLayerView(player: playerVM!.player.avPlayer)
            } else {
                coverImage(fallbackIcon: "tv")
            }

            VStack {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(DesignTokens.live)
                        .frame(width: 8, height: 8)
                    Text(localization.t("player.liveBadge"))
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

    var vodContentView: some View {
        VStack(spacing: 0) {
            ZStack {
                if isVideoActive {
                    InlineAVPlayerLayerView(player: playerVM!.player.avPlayer)
                } else {
                    coverImage(fallbackIcon: "film")
                }
                playButtonOverlay
            }
            .frame(height: 160)
            .clipped()

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
}
