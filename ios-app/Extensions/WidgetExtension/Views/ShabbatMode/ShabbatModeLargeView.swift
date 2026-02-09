import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Shabbat widget: full Shabbat info with times, parasha, countdown.
struct ShabbatModeLargeView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        Link(destination: WidgetDeepLinks.shabbatMode) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                // Header: flame + status
                HStack {
                    Image(systemName: flameIcon)
                        .font(.system(size: DesignTokens.FontSize.xxl))
                        .foregroundStyle(flameColor)
                    Text(statusTitle)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                }

                if let data = entry.shabbatData {
                    // Countdown
                    if let countdown = data.countdown, let label = data.countdownLabel {
                        VStack(spacing: DesignTokens.Spacing.xs) {
                            Text(countdown)
                                .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            Text(label)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .fill(DesignTokens.Glass.bg)
                        )
                    }

                    // Times
                    VStack(spacing: DesignTokens.Spacing.md) {
                        if let candleLighting = data.candleLighting {
                            detailRow(icon: "flame", title: "Candle Lighting", value: candleLighting)
                        }
                        if let havdalah = data.havdalah {
                            detailRow(icon: "star", title: "Havdalah", value: havdalah)
                        }
                    }

                    // Parasha
                    if let parashaHebrew = data.parashaHebrew {
                        VStack(spacing: DesignTokens.Spacing.xs) {
                            Text(parashaHebrew)
                                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            if let parashaEnglish = data.parashaEnglish {
                                Text(parashaEnglish)
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(DesignTokens.Spacing.md)
                        .background(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .fill(DesignTokens.Glass.bg)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                        .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                                )
                        )
                    }

                    if let city = data.city {
                        HStack {
                            Spacer()
                            Image(systemName: "location")
                                .font(.system(size: DesignTokens.FontSize.xs))
                            Text(city)
                                .font(.system(size: DesignTokens.FontSize.xs))
                        }
                        .foregroundStyle(DesignTokens.Text.muted)
                    }
                } else {
                    Spacer()
                    Text("Open the app to load Shabbat times")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .frame(maxWidth: .infinity)
                    Spacer()
                }
            }
            .padding(DesignTokens.Spacing.base)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func detailRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: DesignTokens.Spacing.xl)
            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
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

    private var statusTitle: String {
        if isShabbatActive { return "Shabbat Shalom" }
        if entry.shabbatData?.isErevShabbat ?? false { return "Erev Shabbat" }
        return "Shabbat Times"
    }
}

#Preview(as: .systemLarge) {
    ShabbatModeWidget()
} timeline: {
    ShabbatModeEntry(date: .now, shabbatData: nil)
}
