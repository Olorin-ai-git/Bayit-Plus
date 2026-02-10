import BayitDesignSystem
import SwiftUI

/// Displays current time for a specific culture/timezone with weekend indicator
/// Optimized for tvOS 10-foot UI with larger fonts and better readability
struct TVCultureClock: View {
    let flagEmoji: String
    let locationLabel: String
    let timezone: TimeZone
    let isIsraeli: Bool

    @State private var currentTime = Date()
    @State private var timer: Timer?

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(flagEmoji)
                    .font(.system(size: TVDesignTokens.FontSize.lg))

                Text(locationLabel)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }

            Text(timeString)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold, design: .rounded))
                .foregroundColor(DesignTokens.Text.primary)
                .monospacedDigit()

            if isWeekend {
                Text(isIsraeli ? "Shabbat" : "Weekend")
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundColor(.black)
                    .padding(.horizontal, TVDesignTokens.Spacing.sm)
                    .padding(.vertical, TVDesignTokens.Spacing.xxs)
                    .background(DesignTokens.gold)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
    }

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeZone = timezone
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: currentTime)
    }

    private var isWeekend: Bool {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: currentTime)
        if isIsraeli {
            return weekday == 6 || weekday == 7
        } else {
            return weekday == 7 || weekday == 1
        }
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            currentTime = Date()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}
