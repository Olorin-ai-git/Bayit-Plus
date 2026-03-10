#if os(tvOS)

    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Confirmation dialog shown before starting AI subtitle generation on tvOS.
    /// Displays mode info and AI credit cost, matching Android parity.
    struct TVAIGenerationConfirmDialog: View {
        let modeName: String
        let modeDescription: String
        let onConfirm: () -> Void
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack {
                Color.black.opacity(0.7)
                    .ignoresSafeArea()
                    .onTapGesture { onDismiss() }

                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: "sparkles")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.default)

                    Text(modeName)
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(modeDescription)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 500)

                    creditCostBadge

                    HStack(spacing: TVDesignTokens.Spacing.xl) {
                        Button {
                            onDismiss()
                        } label: {
                            Text(localization.t("common.cancel"))
                                .font(.system(
                                    size: TVDesignTokens.FontSize.md,
                                    weight: .medium
                                ))
                                .foregroundStyle(DesignTokens.Text.secondary)
                                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                                .padding(.vertical, TVDesignTokens.Spacing.md)
                        }

                        Button {
                            onConfirm()
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                Text(localization.t("subtitles.hebrewMode.generate"))
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.md,
                                        weight: .semibold
                                    ))
                            }
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Primary.default.opacity(0.3))
                            .clipShape(
                                RoundedRectangle(
                                    cornerRadius: TVDesignTokens.Spacing.sm
                                )
                            )
                        }
                    }
                }
                .padding(TVDesignTokens.Spacing.xxl)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(
                    RoundedRectangle(
                        cornerRadius: TVDesignTokens.Spacing.md
                    )
                )
                .overlay(
                    RoundedRectangle(
                        cornerRadius: TVDesignTokens.Spacing.md
                    )
                    .stroke(
                        DesignTokens.Primary.default.opacity(0.2),
                        lineWidth: 1
                    )
                )
            }
            .onExitCommand { onDismiss() }
        }

        private var creditCostBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t("stories.creditCost"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(
                RoundedRectangle(
                    cornerRadius: TVDesignTokens.Spacing.xs
                )
            )
        }
    }

#endif
