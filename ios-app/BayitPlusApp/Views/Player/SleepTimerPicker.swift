import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet picker for selecting sleep timer duration.
/// Displays a grid of duration buttons (5-60 min) with glass styling.
struct SleepTimerPicker: View {
    let activeDuration: Int?
    let timerOptions: [Int]
    let onSelect: (Int) -> Void
    let onCancel: () -> Void

    @State private var localization = LocalizationManager()

    private let columns = [
        GridItem(.adaptive(minimum: 80), spacing: DesignTokens.Spacing.sm)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "moon.zzz.fill")
                    .foregroundColor(DesignTokens.Primary.default)
                    .font(.system(size: DesignTokens.FontSize.lg))

                Text(localization.t("player.sleepTimer.setTimer"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.bottom, DesignTokens.Spacing.xs)

            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
                durationButton(
                    label: localization.t("player.sleepTimer.off"),
                    isSelected: activeDuration == nil,
                    action: onCancel
                )

                ForEach(timerOptions, id: \.self) { minutes in
                    durationButton(
                        label: localization.t("player.sleepTimer.minutesFormat", ["minutes": "\(minutes)"]),
                        isSelected: activeDuration == minutes,
                        action: { onSelect(minutes) }
                    )
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .glassCard()
    }

    private func durationButton(label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.base, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
        }
        .glassBackground()
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    isSelected ? DesignTokens.Primary.default.opacity(0.6) : DesignTokens.Glass.border,
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityLabel(label)
    }
}
