import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

// MARK: - Inline

/// Lock Screen inline: "Shabbat in 2h 15m" or "Shabbat Shalom"
struct ShabbatLockScreenInlineView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        if let data = entry.shabbatData {
            if data.isShabbat {
                Label("Shabbat Shalom", systemImage: "flame.fill")
            } else if let countdown = data.countdown {
                Label("Shabbat in \(countdown)", systemImage: "flame")
            } else {
                Label("Shabbat Mode", systemImage: "flame")
            }
        } else {
            Label("Shabbat Mode", systemImage: "flame")
        }
    }
}

// MARK: - Circular

/// Lock Screen circular: flame icon with countdown arc.
struct ShabbatLockScreenCircularView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        if let data = entry.shabbatData {
            ZStack {
                AccessoryWidgetBackground()

                if data.isShabbat {
                    Image(systemName: "flame.fill")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .widgetAccentable()
                } else {
                    VStack(spacing: 1) {
                        Image(systemName: "flame")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .widgetAccentable()
                        if let countdown = data.countdown {
                            Text(countdown)
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                .minimumScaleFactor(0.6)
                        }
                    }
                }
            }
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "flame")
                    .font(.system(size: DesignTokens.FontSize.lg))
            }
        }
    }
}

// MARK: - Rectangular

/// Lock Screen rectangular: times + countdown.
struct ShabbatLockScreenRectangularView: View {
    let entry: ShabbatModeEntry

    var body: some View {
        if let data = entry.shabbatData {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .widgetAccentable()
                    if data.isShabbat {
                        Text("Shabbat Shalom")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    } else if let countdown = data.countdown {
                        Text("Shabbat in \(countdown)")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    } else {
                        Text("Shabbat Mode")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    }
                }

                if let candles = data.candleLighting {
                    Text("Candles: \(candles)")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if let havdalah = data.havdalah {
                    Text("Havdalah: \(havdalah)")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text("Shabbat Mode")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                Text("No data available")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
