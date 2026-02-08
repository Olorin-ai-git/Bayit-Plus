import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Two `DatePicker` wheels for selecting allowed viewing hours.
///
/// Shows "From" and "To" labels with compact time pickers
/// inside a glass-styled card.
struct TimeRangePickerView: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var startTime: Date
    @Binding var endTime: Date

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            timeRow(
                label: localization.t("familyControls.from"),
                selection: $startTime
            )

            Rectangle()
                .fill(DesignTokens.Glass.border)
                .frame(height: 1)

            timeRow(
                label: localization.t("familyControls.to"),
                selection: $endTime
            )
        }
    }

    private func timeRow(
        label: String,
        selection: Binding<Date>
    ) -> some View {
        HStack {
            Image(systemName: "clock")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(label)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            DatePicker(
                "",
                selection: selection,
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .colorScheme(.dark)
            .tint(DesignTokens.Primary.default)
        }
    }
}
