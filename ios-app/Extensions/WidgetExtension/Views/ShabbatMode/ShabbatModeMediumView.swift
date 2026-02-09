import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Shabbat widget: times + countdown + parasha name.
struct ShabbatModeMediumView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        Link(destination: WidgetDeepLinks.shabbatMode) {
            HStack(spacing: DesignTokens.Spacing.lg) {
                // Left: flame + countdown
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: flameIcon)
                        .font(.system(size: DesignTokens.FontSize.xxxl, weight: .light))
                        .foregroundStyle(flameColor)

                    if let countdown = entry.shabbatData?.countdown {
                        Text(countdown)
                            .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    if let label = entry.shabbatData?.countdownLabel {
                        Text(label)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
                .frame(maxWidth: .infinity)

                // Right: times + parasha
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    if let candleLighting = entry.shabbatData?.candleLighting {
                        timeRow(icon: "flame", label: "Candle Lighting", time: candleLighting)
                    }

                    if let havdalah = entry.shabbatData?.havdalah {
                        timeRow(icon: "star", label: "Havdalah", time: havdalah)
                    }

                    if let parasha = entry.shabbatData?.parashaEnglish {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "book")
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Primary.p400)
                            Text(parasha)
                                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(1)
                        }
                    }

                    if entry.shabbatData == nil {
                        Text("Open app to load Shabbat times")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
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

    private func timeRow(icon: String, label: String, time: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: DesignTokens.Spacing.base)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(time)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
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

#Preview(as: .systemMedium) {
    ShabbatModeWidget()
} timeline: {
    ShabbatModeEntry(date: .now, shabbatData: nil)
}
