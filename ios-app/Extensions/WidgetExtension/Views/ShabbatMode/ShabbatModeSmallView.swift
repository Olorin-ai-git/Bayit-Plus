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

                if let countdown = entry.shabbatData?.countdown {
                    Text(countdown)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                if let label = entry.shabbatData?.countdownLabel {
                    Text(label)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }

                if entry.shabbatData == nil {
                    Text("Shabbat")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text("No data available")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(DesignTokens.Spacing.md)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
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
