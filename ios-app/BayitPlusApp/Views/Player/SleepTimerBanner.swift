import BayitDesignSystem
import SwiftUI

/// Compact countdown banner displaying remaining sleep timer time.
/// Shows moon icon, formatted countdown, extend button, and cancel control.
/// Glass-styled to match `MiniAudioPlayerBar`.
struct SleepTimerBanner: View {
    let remainingSeconds: Int
    let onExtend: (Int) -> Void
    let onCancel: () -> Void

    @State private var localization = LocalizationManager()

    private static let extendMinutes = 5

    var body: some View {
        if remainingSeconds > 0 {
            HStack {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Primary.default)

                    Text(localization.t("player.sleepTimer.remaining", ["time": formatCountdown(remainingSeconds)]))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Primary.default)
                        .monospacedDigit()
                }

                Spacer()

                HStack(spacing: DesignTokens.Spacing.sm) {
                    Button {
                        onExtend(Self.extendMinutes)
                    } label: {
                        Text(localization.t("player.sleepTimer.extend", ["minutes": "\(Self.extendMinutes)"]))
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                            .foregroundColor(DesignTokens.Primary.default)
                            .padding(.horizontal, DesignTokens.Spacing.sm)
                            .padding(.vertical, 2)
                            .background(DesignTokens.Primary.default.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    }
                    .accessibilityLabel(localization.t("player.sleepTimer.extend", ["minutes": "\(Self.extendMinutes)"]))

                    Button {
                        onCancel()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.muted)
                            .frame(width: 20, height: 20)
                    }
                    .accessibilityLabel(localization.t("player.sleepTimer.cancel"))
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .glassBackground()
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
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
