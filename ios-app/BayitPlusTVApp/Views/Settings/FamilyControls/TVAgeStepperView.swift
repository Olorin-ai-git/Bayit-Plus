import BayitDesignSystem
import SwiftUI

/// tvOS age stepper using minus/plus buttons instead of Slider.
///
/// The Siri Remote makes Slider controls awkward. This replaces
/// the iOS `AgeSliderView` with discrete button taps that have
/// clear focus targets. A central badge displays the current age.
struct TVAgeStepperView: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double

    init(
        label: String,
        value: Binding<Double>,
        range: ClosedRange<Double> = 1 ... 18,
        step: Double = 1
    ) {
        self.label = label
        _value = value
        self.range = range
        self.step = step
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                decrementButton
                ageBadge
                incrementButton
                Spacer()
                rangeLabel
            }
        }
    }

    // MARK: - Decrement

    private var decrementButton: some View {
        Button {
            let newValue = value - step
            if newValue >= range.lowerBound {
                value = newValue
            }
        } label: {
            Image(systemName: "minus")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(
                    value <= range.lowerBound
                        ? DesignTokens.Text.disabled
                        : DesignTokens.Primary.p400
                )
                .frame(width: 56, height: 56)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        }
        .tvCardStyle()
        .disabled(value <= range.lowerBound)
    }

    // MARK: - Increment

    private var incrementButton: some View {
        Button {
            let newValue = value + step
            if newValue <= range.upperBound {
                value = newValue
            }
        } label: {
            Image(systemName: "plus")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(
                    value >= range.upperBound
                        ? DesignTokens.Text.disabled
                        : DesignTokens.Primary.p400
                )
                .frame(width: 56, height: 56)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        }
        .tvCardStyle()
        .disabled(value >= range.upperBound)
    }

    // MARK: - Badge

    private var ageBadge: some View {
        Text(String(Int(value)))
            .font(.system(
                size: TVDesignTokens.FontSize.xxl,
                weight: .bold,
                design: .monospaced
            ))
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(width: 80, height: 56)
            .background(DesignTokens.Glass.purpleStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
    }

    // MARK: - Range Label

    private var rangeLabel: some View {
        Text("\(Int(range.lowerBound))–\(Int(range.upperBound))")
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
    }
}
