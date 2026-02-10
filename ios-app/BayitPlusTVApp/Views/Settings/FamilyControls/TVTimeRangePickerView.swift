import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS time range picker using focusable hour/minute steppers.
///
/// `DatePicker` and `Picker(.wheel)` are unavailable on tvOS. Instead,
/// up/down buttons for hour (0-23) and minute (0/15/30/45) provide
/// clear focus targets for the Siri Remote.
struct TVTimeRangePickerView: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var startTime: Date
    @Binding var endTime: Date

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            timeRow(
                label: localization.t("familyControls.from"),
                time: $startTime
            )

            Rectangle()
                .fill(DesignTokens.Glass.border)
                .frame(height: 1)

            timeRow(
                label: localization.t("familyControls.to"),
                time: $endTime
            )
        }
    }

    // MARK: - Time Row

    private func timeRow(
        label: String,
        time: Binding<Date>
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "clock")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            HStack(spacing: TVDesignTokens.Spacing.sm) {
                timeUnit(
                    value: hourBinding(for: time),
                    range: 0...23
                )

                Text(":")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xl,
                        weight: .bold,
                        design: .monospaced
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)

                timeUnit(
                    value: minuteBinding(for: time),
                    range: 0...45,
                    step: 15
                )
            }
        }
    }

    // MARK: - Time Unit

    private func timeUnit(
        value: Binding<Int>,
        range: ClosedRange<Int>,
        step: Int = 1
    ) -> some View {
        VStack(spacing: 2) {
            Button {
                let next = value.wrappedValue + step
                value.wrappedValue = next > range.upperBound
                    ? range.lowerBound
                    : next
            } label: {
                Image(systemName: "chevron.up")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 56, height: 28)
            }
            .buttonStyle(.plain)
            .tvFocusStyle()

            Text(String(format: "%02d", value.wrappedValue))
                .font(.system(
                    size: TVDesignTokens.FontSize.xl,
                    weight: .bold,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 56, height: 48)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )

            Button {
                let prev = value.wrappedValue - step
                value.wrappedValue = prev < range.lowerBound
                    ? range.upperBound
                    : prev
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 56, height: 28)
            }
            .buttonStyle(.plain)
            .tvFocusStyle()
        }
    }

    // MARK: - Bindings

    private func hourBinding(for time: Binding<Date>) -> Binding<Int> {
        Binding<Int>(
            get: { Calendar.current.component(.hour, from: time.wrappedValue) },
            set: { newHour in
                var components = Calendar.current.dateComponents(
                    [.hour, .minute], from: time.wrappedValue
                )
                components.hour = newHour
                if let date = Calendar.current.date(from: components) {
                    time.wrappedValue = date
                }
            }
        )
    }

    private func minuteBinding(for time: Binding<Date>) -> Binding<Int> {
        Binding<Int>(
            get: {
                let minute = Calendar.current.component(.minute, from: time.wrappedValue)
                return (minute / 15) * 15
            },
            set: { newMinute in
                var components = Calendar.current.dateComponents(
                    [.hour, .minute], from: time.wrappedValue
                )
                components.minute = newMinute
                if let date = Calendar.current.date(from: components) {
                    time.wrappedValue = date
                }
            }
        )
    }
}
