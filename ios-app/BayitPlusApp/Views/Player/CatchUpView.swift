#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Scrollable catch-up view combining AI summary and transcript timeline.
/// Accepts a shared `CatchUpViewModel` from the parent PlayerView.
struct CatchUpView: View {
    @Environment(LocalizationManager.self) private var localization

    @Bindable var viewModel: CatchUpViewModel
    let channelId: String
    let creditBalance: Int
    let onSeek: (TimeInterval) -> Void
    let onDismiss: () -> Void
    let onUpgrade: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            header

            if viewModel.isLoading {
                Spacer()
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                Spacer()
            } else if viewModel.errorType == .insufficientCredits {
                insufficientCreditsView
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
                    size: DesignTokens.FontSize.lg, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            if creditBalance > 0 {
                GlassBadge(
                    text: "\(creditBalance)",
                    variant: .primary
                )
            }

            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .accessibilityLabel(localization.t("catchup.summary.close"))
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    // MARK: - Content

    private var content: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: DesignTokens.Spacing.md) {
                if let summaryResponse = viewModel.summary {
                    CatchUpSummaryView(
                        response: summaryResponse,
                        onClose: { viewModel.closeSummary() }
                    )
                } else if let legacy = viewModel.legacySummary {
                    legacySummaryCard(legacy)
                }

                ForEach(viewModel.segments) { segment in
                    segmentRow(segment)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    // MARK: - Legacy Summary (fallback)

    private func legacySummaryCard(_ summary: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text(localization.t("catchup.summary.title"))
                    .font(.system(
                        size: DesignTokens.FontSize.sm, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(summary)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(4)
        }
        .padding(DesignTokens.Spacing.base)
        .background(DesignTokens.Glass.purpleLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }

    // MARK: - Segment Row

    private func segmentRow(_ segment: CatchUpSegment) -> some View {
        Button {
            onSeek(segment.timestamp)
        } label: {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                Text(formatTimestamp(segment.timestamp))
                    .font(.system(
                        size: DesignTokens.FontSize.sm,
                        weight: .medium,
                        design: .monospaced
                    ))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .frame(width: 60, alignment: .leading)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    if let speaker = segment.speaker {
                        Text(speaker)
                            .font(.system(
                                size: DesignTokens.FontSize.sm,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                    Text(segment.text)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(3)
                }

                Spacer()

                Image(systemName: "play.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            "Seek to \(formatTimestamp(segment.timestamp)): \(segment.text)"
        )
    }

    // MARK: - Insufficient Credits

    private var insufficientCreditsView: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Spacer()
            InsufficientCreditsModalView(
                requiredCredits: 1,
                currentBalance: creditBalance,
                onUpgrade: onUpgrade,
                onDismiss: onDismiss
            )
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    // MARK: - Error

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            GlassButton(
                localization.t("catchup.error.retry"),
                variant: .secondary
            ) {
                Task { await viewModel.loadCatchUp(channelId: channelId) }
            }
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
