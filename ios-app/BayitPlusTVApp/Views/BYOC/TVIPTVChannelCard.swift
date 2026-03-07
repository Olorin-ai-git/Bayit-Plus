import BayitBYOC
import BayitDesignSystem
import SwiftUI

/// Card for an IPTV channel in the Live TV grid.
struct TVIPTVChannelCard: View {
    let channel: BYOCChannel
    let onSelect: () -> Void
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 0) {
                logoArea
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .clipped()
                infoArea
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }
        .buttonStyle(TVIPTVCardButtonStyle())
        .focusEffectDisabled()
    }

    private var logoArea: some View {
        ZStack(alignment: .topTrailing) {
            if let url = channel.logoURL {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img.resizable().aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .padding(TVDesignTokens.Spacing.md)
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }

            GlassBadge(text: "IPTV", variant: .info)
                .padding(TVDesignTokens.Spacing.sm)
        }
        .background(DesignTokens.Glass.bgMedium)
    }

    private var placeholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var infoArea: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
            Text(channel.name)
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            Text(channel.group)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .lineLimit(1)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgStrong)
    }
}

private struct TVIPTVCardButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .focusEffectDisabled()
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .shadow(
                color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0, y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
    }
}
