#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVCatchUpView + Error Views

    extension TVCatchUpView {
        var insufficientCreditsView: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("catchup.error.insufficientCredits"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("catchup.summary.creditsRemaining", ["count": "\(viewModel.creditBalance)"]))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                GlassButton(
                    localization.t("catchup.summary.close"),
                    variant: .secondary,
                    size: .large
                ) {
                    onDismiss()
                }
                .tvFocusStyle()
                Spacer()
            }
        }

        var serviceUnavailableView: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                Image(systemName: "icloud.slash")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("catchup.error.failed"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                GlassButton(
                    localization.t("catchup.error.retry"),
                    variant: .secondary,
                    size: .large
                ) {
                    Task {
                        await viewModel.loadCatchUp(channelId: channelId)
                    }
                }
                .tvFocusStyle()
                Spacer()
            }
        }

        func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                GlassButton(
                    localization.t("catchup.error.retry"),
                    variant: .secondary,
                    size: .large
                ) {
                    Task {
                        await viewModel.loadCatchUp(channelId: channelId)
                    }
                }
                .tvFocusStyle()
                Spacer()
            }
        }
    }
#endif
