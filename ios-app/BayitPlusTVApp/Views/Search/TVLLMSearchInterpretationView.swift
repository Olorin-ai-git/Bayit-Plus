import BayitDesignSystem
import SwiftUI

/// Displays the AI interpretation of a natural language search query
/// with a confidence meter bar and percentage indicator. tvOS version.
struct TVLLMSearchInterpretationView: View {
    let interpretation: SearchInterpretation

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            header

            if let text = interpretation.text {
                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            if let confidence = interpretation.confidence {
                confidenceMeter(confidence)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("AI interpretation: \(interpretation.text ?? "")")
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "sparkles")
                .foregroundStyle(DesignTokens.Primary.p400)
                .accessibilityHidden(true)

            Text("AI Interpretation")
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Confidence Meter

    private func confidenceMeter(_ confidence: Double) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text("Confidence")
                .font(.system(size: TVDesignTokens.FontSize.xs))
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
            .frame(height: 8)

            Text("\(Int(confidence * 100))%")
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(confidenceColor(confidence))
                .frame(width: 50, alignment: .trailing)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Confidence: \(Int(confidence * 100)) percent")
    }

    private func confidenceColor(_ confidence: Double) -> Color {
        if confidence >= 0.8 { return DesignTokens.Success.default }
        if confidence >= 0.5 { return DesignTokens.Warning.default }
        return DesignTokens.ErrorColor.default
    }
}
