#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVCatchUpView + Legacy Summary & Segment Row

    extension TVCatchUpView {
        // MARK: - Legacy Summary

        func legacySummaryCard(_ summary: String) -> some View {
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

        func segmentRow(_ segment: CatchUpSegment) -> some View {
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

        func formatTimestamp(_ seconds: TimeInterval) -> String {
            let mins = Int(seconds) / 60
            let secs = Int(seconds) % 60
            return String(format: "%d:%02d", mins, secs)
        }
    }
#endif
