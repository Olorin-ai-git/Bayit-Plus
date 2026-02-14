import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct VideoProcessingStepView: View {
    @Environment(LocalizationManager.self) private var localization

    let isUploading: Bool
    let errorMessage: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            if isUploading {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(1.5)
                    .tint(.white)
                Text(localization.t("avatar.processing.uploading"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("avatar.processing.uploadingDesc"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.xl)
            } else if let error = errorMessage {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .multilineTextAlignment(.center)
                GlassButton(localization.t("avatar.processing.retryUpload"), variant: .secondary, size: .medium) {
                    onRetry()
                }
            }

            Spacer()
        }
    }
}
