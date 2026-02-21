import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// A single row displaying a zman (halachic time) with icon, label,
/// time string, and accent color.
struct ZmanimTimeRow: View {
    let icon: String
    let label: String
    let time: String
    let color: Color

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(color)
                .frame(width: 28)

            Text(label)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(time)
                .font(.system(
                    size: DesignTokens.FontSize.base,
                    weight: .semibold,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}

/// Zmanim section displaying candle lighting and havdalah times.
struct ZmanimTimesSection: View {
    @Environment(LocalizationManager.self) private var localization

    let candleLightingTime: String?
    let havdalahTime: String?

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.dailyTimes"))

            GlassCard {
                VStack(spacing: 0) {
                    if let candle = candleLightingTime {
                        ZmanimTimeRow(
                            icon: "candle.fill",
                            label: localization.t("shabbat.candleLighting"),
                            time: candle,
                            color: DesignTokens.Warning.default
                        )
                        divider
                    }

                    if let havdalah = havdalahTime {
                        ZmanimTimeRow(
                            icon: "star.fill",
                            label: localization.t("shabbat.havdalah"),
                            time: havdalah,
                            color: DesignTokens.Primary.p400
                        )
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var divider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(height: 1)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
            .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
