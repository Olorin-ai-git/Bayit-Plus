#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Enhanced AI-generated summary card displaying key points, program info,
/// credit usage, and cached indicator. Matches web app feature parity.
struct CatchUpSummaryView: View {
    @Environment(LocalizationManager.self) private var localization

    let response: CatchUpSummaryResponse
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            header
            programInfoSection
            summaryText
            keyPointsList
            footer
        }
        .padding(DesignTokens.Spacing.base)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("catchup.summary.title"))
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text(localization.t("catchup.summary.title"))
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Spacer()

            if response.cached == true {
                Text(localization.t("catchup.summary.cached"))
                    .font(.system(
                        size: DesignTokens.FontSize.xs, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Success.default)
            }

            Button { onClose() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .accessibilityLabel(localization.t("catchup.summary.close"))
        }
    }

    // MARK: - Program Info

    @ViewBuilder
    private var programInfoSection: some View {
        if let info = response.programInfo, info.title != nil {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if let title = info.title {
                    Text(title)
                        .font(.system(
                            size: DesignTokens.FontSize.sm, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                if let genre = info.genre {
                    GlassBadge(text: genre, variant: .info)
                }
            }
        }
    }

    // MARK: - Summary Text

    private var summaryText: some View {
        ScrollView(.vertical, showsIndicators: true) {
            Text(response.summary)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(4)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxHeight: 160)
    }

    // MARK: - Key Points

    @ViewBuilder
    private var keyPointsList: some View {
        if let points = response.keyPoints, !points.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("catchup.summary.keyPoints"))
                    .font(.system(
                        size: DesignTokens.FontSize.sm, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)

                ForEach(Array(points.enumerated()), id: \.offset) { _, point in
                    HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .padding(.top, 4)
                        Text(point)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if let minutes = response.windowMinutes {
                Text(localization.t(
                    "catchup.summary.windowInfo",
                    ["minutes": String(minutes)]
                ))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            if let used = response.creditsUsed {
                Text(localization.t(
                    "catchup.summary.creditsUsed",
                    ["count": String(used)]
                ))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.secondary)
            }

            if let remaining = response.remainingCredits {
                Text(localization.t(
                    "catchup.summary.creditsRemaining",
                    ["count": String(remaining)]
                ))
                .font(.system(
                    size: DesignTokens.FontSize.xs, weight: .medium
                ))
                .foregroundStyle(DesignTokens.Primary.p300)
            }
        }
    }
}
#endif
