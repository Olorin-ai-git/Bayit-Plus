import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Shabbat widget: flame icon + countdown text.
struct ShabbatModeSmallView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        Link(destination: WidgetDeepLinks.shabbatMode) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: flameIcon)
                    .font(.system(size: DesignTokens.FontSize.display, weight: .light))
                    .foregroundStyle(flameColor)
                    .symbolEffect(.pulse, options: .repeating, isActive: isShabbatActive)
                    .accessibilityLabel(isShabbatActive ? "Shabbat candles lit" : "Shabbat candles")

                if let countdown = entry.shabbatData?.countdown {
                    Text(countdown)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .accessibilityLabel("Time remaining: \(countdown)")
                }

                if let label = entry.shabbatData?.countdownLabel {
                    Text(label)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }

                if entry.shabbatData == nil {
                    Text("Shabbat")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text("No data available")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minWidth: 44, minHeight: 44)
            .padding(DesignTokens.Spacing.md)
        }
        .accessibilityLabel(accessibilityDescription)
        .accessibilityHint("Opens Shabbat mode settings")
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var accessibilityDescription: String {
        if let data = entry.shabbatData, let countdown = data.countdown, let label = data.countdownLabel {
            return "Shabbat mode: \(countdown) \(label)"
        }
        return "Shabbat mode"
    }

    private var isShabbatActive: Bool {
        entry.shabbatData?.isShabbat ?? false
    }

    private var flameIcon: String {
        isShabbatActive ? "flame.fill" : "flame"
    }

    private var flameColor: Color {
        isShabbatActive ? DesignTokens.Warning.default : DesignTokens.Primary.p400
    }
}

#Preview(as: .systemSmall) {
    ShabbatModeWidget()
} timeline: {
    ShabbatModeEntry(date: .now, shabbatData: nil)
}
