import BayitDesignSystem
import SwiftUI

/// Displays current time for a specific culture/timezone with weekend indicator.
/// Optimized for tvOS 10-foot UI with larger fonts and better readability.
/// Set `compact: true` for a single-line inline variant (used in the top clock bar).
struct TVCultureClock: View {
    let flagEmoji: String
    let locationLabel: String
    let timezone: TimeZone
    let isIsraeli: Bool
    let compact: Bool

    @State private var currentTime = Date()
    @State private var timer: Timer?

    init(
        flagEmoji: String,
        locationLabel: String,
        timezone: TimeZone,
        isIsraeli: Bool,
        compact: Bool = false
    ) {
        self.flagEmoji = flagEmoji
        self.locationLabel = locationLabel
        self.timezone = timezone
        self.isIsraeli = isIsraeli
        self.compact = compact
    }

    var body: some View {
        Group {
            if compact {
                compactBody
            } else {
                fullBody
            }
        }
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
    }

    // MARK: - Compact (single-line, no background)

    private var compactBody: some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Text(flagEmoji)
                .font(.system(size: TVDesignTokens.FontSize.sm))

            Text(locationLabel)
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundColor(DesignTokens.Text.secondary)

            Text(timeString)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold, design: .rounded))
                .foregroundColor(DesignTokens.Text.primary)
                .monospacedDigit()
        }
    }

    // MARK: - Full (card with background)

    private var fullBody: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(flagEmoji)
                    .font(.system(size: TVDesignTokens.FontSize.xl))

                Text(locationLabel)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.Text.secondary)
            }

            Text(timeString)
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold, design: .rounded))
                .foregroundColor(DesignTokens.Text.primary)
                .monospacedDigit()

            Text(dateString)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)

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
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                .fill(Color.white.opacity(0.06))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .fill(.ultraThinMaterial.opacity(0.3))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeZone = timezone
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: currentTime)
    }

    private var dateString: String {
        let formatter = DateFormatter()
        formatter.timeZone = timezone
        formatter.dateFormat = "EEEE, MMM d"
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
