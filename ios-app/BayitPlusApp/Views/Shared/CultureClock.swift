import BayitDesignSystem
import SwiftUI

/// Displays current time for a specific culture/timezone with weekend indicator
struct CultureClock: View {
    let flagEmoji: String
    let locationLabel: String
    let timezone: TimeZone
    let isIsraeli: Bool  // For Shabbat vs Weekend logic

    @State private var currentTime = Date()
    @State private var timer: Timer?

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(flagEmoji)
                    .font(.system(size: DesignTokens.FontSize.xl))

                Text(locationLabel)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }

            Text(timeString)
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold, design: .rounded))
                .foregroundColor(DesignTokens.Text.primary)
                .monospacedDigit()

            Text(isIsraeli ? "Shabbat" : "Weekend")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundColor(.black)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xxs)
                .background(DesignTokens.gold)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                .opacity(isWeekend ? 1 : 0)
        }
        .onAppear {
            startTimer()
        }
        .onDisappear {
            stopTimer()
        }
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
            // Friday (6) or Saturday (7) for Israeli/Jewish calendar
            return weekday == 6 || weekday == 7
        } else {
            // Saturday (7) or Sunday (1) for Western calendar
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
