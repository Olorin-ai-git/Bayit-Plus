import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays the AI interpretation of a natural language search query
/// with a confidence meter bar and percentage indicator.
struct LLMSearchInterpretationView: View {
    @Environment(LocalizationManager.self) private var localization
    let interpretation: SearchInterpretation

    var body: some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                header

                if let text = interpretation.text {
                    Text(text)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                if let confidence = interpretation.confidence {
                    confidenceMeter(confidence)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(localization.t("aiCompanion.title")): \(interpretation.text ?? "")")
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .foregroundStyle(DesignTokens.Primary.p400)
                .accessibilityHidden(true)

            Text(localization.t("aiCompanion.title"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Confidence Meter

    private func confidenceMeter(_ confidence: Double) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("common.confidence"))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(DesignTokens.Glass.bgMedium)

                    Capsule()
                        .fill(confidenceColor(confidence))
                        .frame(width: geometry.size.width * CGFloat(min(max(confidence, 0), 1)))
                }
            }
            .frame(height: 6)

            Text("\(Int(confidence * 100))%")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(confidenceColor(confidence))
                .frame(width: 36, alignment: .trailing)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(localization.t("common.confidence")): \(Int(confidence * 100)) \(localization.t("common.percent"))")
    }

    private func confidenceColor(_ confidence: Double) -> Color {
        if confidence >= 0.8 { return DesignTokens.Success.default }
        if confidence >= 0.5 { return DesignTokens.Warning.default }
        return DesignTokens.ErrorColor.default
    }
}
