#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Standalone AI-generated catch-up summary card view for tvOS.
/// Displays the summary text, key points, credits used/remaining, and program info.
struct TVCatchUpSummaryView: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: CatchUpViewModel
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            contentView
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerBar: some View {
        HStack {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text(localization.t("catchup.summary.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            Spacer()
            if viewModel.creditBalance > 0 {
                Text("\(viewModel.creditBalance)")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            }
            GlassButton(localization.t("catchup.summary.close"), variant: .secondary, size: .medium) {
                viewModel.closeSummary()
                onDismiss()
            }
            .tvFocusStyle()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    @ViewBuilder
    private var contentView: some View {
        if viewModel.isLoading {
            centerState(systemImage: "hourglass", text: localization.t("catchup.summary.loading"))
        } else if let error = viewModel.error {
            errorStateView(error)
        } else if let summary = viewModel.summary {
            summaryScrollView(summary)
        } else {
            centerState(systemImage: "doc.text", text: localization.t("catchup.summary.noContent"))
        }
    }

    private func centerState(systemImage: String, text: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()
            if viewModel.isLoading {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(2.0)
            } else {
                Image(systemName: systemImage)
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
        }
    }

    private func errorStateView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
            GlassButton(localization.t("catchup.summary.close"), variant: .secondary, size: .large) {
                viewModel.closeSummary()
                onDismiss()
            }
            .tvFocusStyle()
            Spacer()
        }
    }

    private func summaryScrollView(_ summary: CatchUpSummaryResponse) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if summary.cached == true {
                    HStack {
                        Spacer()
                        Text(localization.t("catchup.summary.cached"))
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                            .foregroundStyle(DesignTokens.Success.default)
                    }
                }
                programSection(summary)
                Text(summary.summary)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineSpacing(6)
                keyPointsList(summary)
                footerInfo(summary)
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.purpleLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    @ViewBuilder
    private func programSection(_ summary: CatchUpSummaryResponse) -> some View {
        if let info = summary.programInfo {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                if let title = info.title {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if let genre = info.genre {
                        Text(genre)
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, TVDesignTokens.Spacing.xxs)
                            .background(DesignTokens.Glass.bgLight)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                    }
                    if let host = info.host {
                        Text(host)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func keyPointsList(_ summary: CatchUpSummaryResponse) -> some View {
        if let points = summary.keyPoints, !points.isEmpty {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("catchup.summary.keyPoints"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                ForEach(Array(points.enumerated()), id: \.offset) { _, point in
                    HStack(alignment: .top, spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .padding(.top, 2)
                        Text(point)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
            }
        }
    }

    private func footerInfo(_ summary: CatchUpSummaryResponse) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            if let minutes = summary.windowMinutes {
                Text(localization.t("catchup.summary.windowInfo", ["minutes": String(minutes)]))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Spacer()
            if let used = summary.creditsUsed {
                Text(localization.t("catchup.summary.creditsUsed", ["count": String(used)]))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            if let remaining = summary.remainingCredits {
                Text(localization.t("catchup.summary.creditsRemaining", ["count": String(remaining)]))
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }
        }
    }
}
#endif
