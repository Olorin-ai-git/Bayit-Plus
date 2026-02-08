import BayitDesignSystem
import SwiftUI
import UIKit

/// Custom age slider with a floating badge showing the current value.
///
/// Displays a label, a purple-tinted slider, and a badge overlay
/// indicating the selected age. Used in Family Controls for
/// kids and youngsters age limits.
struct AgeSliderView: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double

    init(
        label: String,
        value: Binding<Double>,
        range: ClosedRange<Double> = 1...18,
        step: Double = 1
    ) {
        self.label = label
        self._value = value
        self.range = range
        self.step = step
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                ageBadge
            }

            Slider(
                value: $value,
                in: range,
                step: step
            ) {
                EmptyView()
            } minimumValueLabel: {
                Text(String(Int(range.lowerBound)))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            } maximumValueLabel: {
                Text(String(Int(range.upperBound)))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .tint(DesignTokens.Primary.default)
            .onChange(of: value) { _, _ in
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
    }

    private var ageBadge: some View {
        Text(String(Int(value)))
            .font(.system(
                size: DesignTokens.FontSize.base,
                weight: .bold,
                design: .monospaced
            ))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.purpleStrong)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
    }
}
