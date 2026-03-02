#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// fullScreenCover with card-style buttons for selecting HLS quality on tvOS.
struct TVQualitySelectorView: View {
    @Environment(LocalizationManager.self) private var localization
    let currentQuality: StreamQuality
    let onSelect: (StreamQuality) -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Text(localization.t("player.videoQuality"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(StreamQuality.allCases) { quality in
                    Button { onSelect(quality) } label: {
                        VStack(spacing: TVDesignTokens.Spacing.md) {
                            Image(systemName: quality == currentQuality ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 32))
                                .foregroundStyle(quality == currentQuality ? DesignTokens.Primary.p400 : DesignTokens.Text.muted)

                            Text(quality.displayName)
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)

                            Text(quality.displayDescription)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        .frame(minWidth: TVDesignTokens.MinSize.focusableWidth, minHeight: TVDesignTokens.MinSize.focusableHeight)
                        .padding(TVDesignTokens.Spacing.lg)
                    }
                    .tvCardStyle()
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }
}
#endif
