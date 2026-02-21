#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVCatchUpView + Summary Cards

    extension TVCatchUpView {
        // MARK: - Enhanced Summary Card

        func enhancedSummaryCard(
            _ response: CatchUpSummaryResponse
        ) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(DesignTokens.Primary.p300)
                    Text(localization.t("catchup.summary.title"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Primary.p300)

                    Spacer()

                    if response.cached == true {
                        Text(localization.t("catchup.summary.cached"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.xs,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Success.default)
                    }
                }

                // Program info
                if let info = response.programInfo, let title = info.title {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(title)
                            .font(.system(
                                size: TVDesignTokens.FontSize.sm,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if let genre = info.genre {
                            Text(genre)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.xs
                                ))
                                .foregroundStyle(DesignTokens.Primary.p400)
                                .padding(
                                    .horizontal, TVDesignTokens.Spacing.sm
                                )
                                .padding(
                                    .vertical, TVDesignTokens.Spacing.xxs
                                )
                                .background(DesignTokens.Glass.bgLight)
                                .clipShape(RoundedRectangle(
                                    cornerRadius: TVDesignTokens.Radius.sm
                                ))
                        }
                    }
                }

                Text(response.summary)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineSpacing(6)

                // Key points
                if let points = response.keyPoints, !points.isEmpty {
                    VStack(
                        alignment: .leading,
                        spacing: TVDesignTokens.Spacing.sm
                    ) {
                        Text(localization.t("catchup.summary.keyPoints"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.sm,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.secondary)

                        ForEach(
                            Array(points.enumerated()), id: \.offset
                        ) { _, point in
                            HStack(
                                alignment: .top,
                                spacing: TVDesignTokens.Spacing.xs
                            ) {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12))
                                    .foregroundStyle(
                                        DesignTokens.Primary.p400
                                    )
                                    .padding(.top, 4)
                                Text(point)
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.sm
                                    ))
                                    .foregroundStyle(
                                        DesignTokens.Text.primary
                                    )
                            }
                        }
                    }
                }

                // Footer: window + credits
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let minutes = response.windowMinutes {
                        Text(localization.t(
                            "catchup.summary.windowInfo",
                            ["minutes": String(minutes)]
                        ))
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if let used = response.creditsUsed {
                        Text(localization.t(
                            "catchup.summary.creditsUsed",
                            ["count": String(used)]
                        ))
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    if let remaining = response.remainingCredits {
                        Text(localization.t(
                            "catchup.summary.creditsRemaining",
                            ["count": String(remaining)]
                        ))
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Primary.p300)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.purpleLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }
#endif
