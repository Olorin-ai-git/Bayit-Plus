#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Focus-compatible picker for selecting sleep timer duration on tvOS.
/// Uses `.tvCardStyle()` for Siri Remote focus navigation and
/// `TVDesignTokens` for 10-foot UI sizing.
struct TVSleepTimerPicker: View {
    let activeDuration: Int?
    let timerOptions: [Int]
    let onSelect: (Int) -> Void
    let onCancel: () -> Void

    @State private var localization = LocalizationManager()

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: TVDesignTokens.Spacing.md)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "moon.zzz.fill")
                    .foregroundColor(DesignTokens.Primary.default)
                    .font(.system(size: TVDesignTokens.FontSize.xl))

                Text(localization.t("player.sleepTimer.setTimer"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.md) {
                tvDurationButton(
                    label: localization.t("player.sleepTimer.off"),
                    isSelected: activeDuration == nil,
                    action: onCancel
                )

                ForEach(timerOptions, id: \.self) { minutes in
                    tvDurationButton(
                        label: localization.t("player.sleepTimer.minutesFormat", ["minutes": "\(minutes)"]),
                        isSelected: activeDuration == minutes,
                        action: { onSelect(minutes) }
                    )
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func tvDurationButton(label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.md, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity)
                .frame(height: TVDesignTokens.MinSize.focusableHeight)
        }
        .tvCardStyle()
        .accessibilityLabel(label)
    }
}
#endif
