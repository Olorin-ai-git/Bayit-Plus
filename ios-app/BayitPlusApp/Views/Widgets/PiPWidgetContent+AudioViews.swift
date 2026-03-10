import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - PiPWidgetContainerView Audio & Misc Content Views

extension PiPWidgetContainerView {
    var radioContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "radio", fallbackColor: DesignTokens.Warning.default)

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
                        Text(localization.t("common.live"))
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(DesignTokens.live)
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)

            compactTransportControls
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.bottom, DesignTokens.Spacing.sm)
        }
    }

    var podcastContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "mic.fill", fallbackColor: DesignTokens.Success.default)

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

    var audiobookContentView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                coverThumbnail(fallbackIcon: "book.fill", fallbackColor: DesignTokens.Info.default)

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

    var iframeContentView: some View {
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
    var customContentView: some View {
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

    var placeholderView: some View {
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
}
