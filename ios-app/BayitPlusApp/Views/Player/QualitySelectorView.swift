#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet picker for selecting HLS quality tier during playback.
struct QualitySelectorView: View {
    @Environment(LocalizationManager.self) private var localization
    let currentQuality: StreamQuality
    let onSelect: (StreamQuality) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("player.quality"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(StreamQuality.allCases) { quality in
                qualityRow(quality)
            }

            GlassButton(localization.t("common.close"), variant: .ghost) { onDismiss() }
        }
        .padding(DesignTokens.Spacing.xl)
        .background(DesignTokens.Background.elevated)
    }

    private func qualityRow(_ quality: StreamQuality) -> some View {
        Button {
            onSelect(quality)
            onDismiss()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(quality.displayName)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(quality.displayDescription)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                if quality == currentQuality {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(quality == currentQuality ? DesignTokens.Glass.purpleLight : DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(quality.displayName) quality")
    }
}
#endif
