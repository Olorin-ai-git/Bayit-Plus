import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVZmanimView + Sections

extension TVZmanimView {
    // MARK: - Status

    func statusSection(_ vm: ShabbatViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(
                    systemName: vm.isShabbatActive
                        ? "flame.fill"
                        : "moon.stars"
                )
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(
                    vm.isShabbatActive
                        ? DesignTokens.Warning.default
                        : DesignTokens.Primary.p400
                )

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(
                        vm.isShabbatActive
                            ? localization.t("shabbat.active")
                            : localization.t("shabbat.inactive")
                    )
                    .font(.system(
                        size: TVDesignTokens.FontSize.xl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                    if let countdown = vm.countdown,
                       let label = vm.countdownLabel
                    {
                        Text("\(countdown) \(label)")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()
            }

            if let hebrew = vm.parashaNameHebrew {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "book.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: 0) {
                        Text(hebrew)
                            .font(.system(
                                size: TVDesignTokens.FontSize.lg,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if let english = vm.parashaNameEnglish {
                            Text(english)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Zmanim Times

    func zmanimTimesSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.dailyTimes"))

            VStack(spacing: 0) {
                if let candle = vm.candleLightingTime {
                    zmanimRow(
                        icon: "candle.fill",
                        label: localization.t("shabbat.candleLighting"),
                        time: candle,
                        color: DesignTokens.Warning.default
                    )
                    divider
                }

                if let havdalah = vm.havdalahTime {
                    zmanimRow(
                        icon: "star.fill",
                        label: localization.t("shabbat.havdalah"),
                        time: havdalah,
                        color: DesignTokens.Primary.p400
                    )
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }
}
