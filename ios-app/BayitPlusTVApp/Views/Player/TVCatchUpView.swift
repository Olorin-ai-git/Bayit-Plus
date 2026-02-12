#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS catch-up view with AI summary, key points, credit usage,
/// and transcript timeline. Accepts shared CatchUpViewModel from parent.
struct TVCatchUpView: View {
    @Environment(LocalizationManager.self) private var localization

    @Bindable var viewModel: CatchUpViewModel
    let channelId: String
    let onSeek: (TimeInterval) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            header

            if viewModel.isLoading {
                Spacer()
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.5)
                Spacer()
            } else if viewModel.errorType == .insufficientCredits {
                insufficientCreditsView
            } else if viewModel.errorType == .serviceUnavailable {
                serviceUnavailableView
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                content
            }
        }
        .background(DesignTokens.Background.primary)
        .task { await viewModel.loadCatchUp(channelId: channelId) }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text(localization.t("catchup.button.title"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            if viewModel.creditBalance > 0 {
                Text("\(viewModel.creditBalance)")
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(
                        cornerRadius: TVDesignTokens.Radius.sm
                    ))
            }

            GlassButton(
                localization.t("catchup.summary.close"),
                variant: .secondary,
                size: .medium
            ) {
                onDismiss()
            }
            .tvFocusStyle()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Content

    private var content: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                if let summaryResponse = viewModel.summary {
                    enhancedSummaryCard(summaryResponse)
                } else if let legacy = viewModel.legacySummary {
                    legacySummaryCard(legacy)
                }

                ForEach(viewModel.segments) { segment in
                    segmentRow(segment)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    // MARK: - Enhanced Summary Card

    private func enhancedSummaryCard(
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

    // MARK: - Legacy Summary

    private func legacySummaryCard(_ summary: String) -> some View {
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
            }

            Text(summary)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(6)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.purpleLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Segment Row

    private func segmentRow(_ segment: CatchUpSegment) -> some View {
        Button { onSeek(segment.timestamp) } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(formatTimestamp(segment.timestamp))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .medium,
                        design: .monospaced
                    ))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .frame(width: 80, alignment: .leading)

                VStack(
                    alignment: .leading,
                    spacing: TVDesignTokens.Spacing.xs
                ) {
                    if let speaker = segment.speaker {
                        Text(speaker)
                            .font(.system(
                                size: TVDesignTokens.FontSize.base,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                    Text(segment.text)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(3)
                }

                Spacer()

                Image(systemName: "play.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(
                minWidth: TVDesignTokens.MinSize.focusableWidth,
                minHeight: TVDesignTokens.MinSize.focusableHeight
            )
        }
        .buttonStyle(.card)
        .accessibilityLabel(
            "Seek to \(formatTimestamp(segment.timestamp))"
        )
    }

    // MARK: - Error Views

    private var insufficientCreditsView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("catchup.error.insufficientCredits"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.primary)
            Text("\(viewModel.creditBalance) credits remaining")
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

    private var serviceUnavailableView: some View {
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

    private func errorView(_ message: String) -> some View {
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

    // MARK: - Helpers

    private func formatTimestamp(_ seconds: TimeInterval) -> String {
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
#endif
