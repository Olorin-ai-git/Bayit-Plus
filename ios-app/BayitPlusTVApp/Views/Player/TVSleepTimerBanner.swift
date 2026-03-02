#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Focus-aware countdown banner for tvOS sleep timer.
/// Displays moon icon, formatted countdown, and a focusable extend button
/// sized for Siri Remote interaction.
struct TVSleepTimerBanner: View {
    let remainingSeconds: Int
    let onExtend: (Int) -> Void
    let onCancel: () -> Void

    @State private var localization = LocalizationManager()

    private static let extendMinutes = 5

    var body: some View {
        if remainingSeconds > 0 {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Primary.default)

                    Text(localization.t("player.sleepTimer.remaining", ["time": formatCountdown(remainingSeconds)]))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                        .foregroundColor(DesignTokens.Primary.default)
                        .monospacedDigit()
                }

                Spacer()

                Button {
                    onExtend(Self.extendMinutes)
                } label: {
                    Text(localization.t("player.sleepTimer.extend", ["minutes": "\(Self.extendMinutes)"]))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Primary.default)
                        .frame(height: TVDesignTokens.MinSize.focusableHeight)
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                }
                .tvCardStyle()
                .accessibilityLabel(localization.t("player.sleepTimer.extend", ["minutes": "\(Self.extendMinutes)"]))

                Button {
                    onCancel()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Text.muted)
                        .frame(
                            width: TVDesignTokens.MinSize.focusableWidth,
                            height: TVDesignTokens.MinSize.focusableHeight
                        )
                }
                .tvCardStyle()
                .accessibilityLabel(localization.t("player.sleepTimer.cancel"))
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Primary.default.opacity(0.2), lineWidth: 1)
            )
        }
    }

    private func formatCountdown(_ totalSeconds: Int) -> String {
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
#endif
