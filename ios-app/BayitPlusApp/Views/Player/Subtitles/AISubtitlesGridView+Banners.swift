import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on AISubtitlesPickerView providing banner and badge subviews.
extension AISubtitlesPickerView {
    var firstTimeHintBanner: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "info.circle")
                .foregroundColor(.blue)

            Text(localization.t("subtitles.hebrewModeHint"))
                .font(.system(size: 13))
                .foregroundColor(.blue.opacity(0.9))
                .multilineTextAlignment(.leading)

            Button {
                showFirstTimeHint = false
            } label: {
                Image(systemName: "xmark")
                    .foregroundColor(.blue)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.blue.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func errorBanner(_ error: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.red)

            Text(error)
                .font(.system(size: 13))
                .foregroundColor(.red.opacity(0.9))
                .multilineTextAlignment(.leading)

            Button {
                generationError = nil
            } label: {
                Image(systemName: "xmark")
                    .foregroundColor(.red)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.red.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    var noHebrewWarning: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text(localization.t("subtitles.noHebrewSubtitles"))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.orange)

                Text(localization.t("subtitles.uploadHebrewFirst"))
                    .font(.system(size: 12))
                    .foregroundColor(.orange.opacity(0.7))
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.orange.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
