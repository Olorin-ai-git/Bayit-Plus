import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Step 2: Displays AI normalization results summary.
struct BYOCAnalysisSummaryStep: View {
    @Environment(LocalizationManager.self) private var localization

    let plan: NormalizationPlan?
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            if let plan {
                Text(localization.t("byoc.onboarding.analysisComplete"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    statRow(
                        icon: "checkmark.circle.fill",
                        color: .green,
                        text: localization.t("byoc.onboarding.channelsIdentified"),
                        value: "\(plan.stats.matchedChannels)"
                    )
                    if plan.stats.matchedVod > 0 {
                        statRow(
                            icon: "film.fill",
                            color: .blue,
                            text: localization.t("byoc.onboarding.vodMatched"),
                            value: "\(plan.stats.matchedVod)"
                        )
                    }
                    if plan.stats.duplicatesFound > 0 {
                        statRow(
                            icon: "doc.on.doc.fill",
                            color: .orange,
                            text: localization.t("byoc.onboarding.duplicatesFound"),
                            value: "\(plan.stats.duplicatesFound)"
                        )
                    }
                    if let health = plan.healthSample, health.tested > 0 {
                        let pct = Int(Double(health.alive) / Double(health.tested) * 100)
                        statRow(
                            icon: "heart.fill",
                            color: pct > 80 ? .green : .orange,
                            text: localization.t("byoc.onboarding.streamsHealthy"),
                            value: "\(pct)%"
                        )
                    }
                }
                .padding()
                .background(DesignTokens.Background.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

                if !plan.detectedLanguages.isEmpty {
                    HStack {
                        Text(localization.t("byoc.onboarding.languages"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                        Text(plan.detectedLanguages.joined(separator: ", "))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }

                if !plan.suggestedCategories.isEmpty {
                    HStack {
                        Text(localization.t("byoc.onboarding.topCategories"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                        Text(plan.suggestedCategories.prefix(3).joined(separator: ", "))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }

                Spacer()

                Button {
                    onContinue()
                } label: {
                    HStack {
                        Spacer()
                        Text(localization.t("common.continue"))
                        Spacer()
                    }
                    .padding()
                    .background(DesignTokens.Primary.default)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.xl)
            } else {
                ProgressView()
            }
        }
    }

    private func statRow(
        icon: String, color: Color, text: String, value: String
    ) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 24)
            Text(text)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }
}
