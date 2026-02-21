import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Zmanim Times, Settings & Content Sections

extension ZmanimView {
    func zmanimTimesSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.dailyTimes"))

            GlassCard {
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
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func zmanimRow(
        icon: String,
        label: String,
        time: String,
        color: Color
    ) -> some View {
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

    var divider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(height: 1)
    }

    func settingsSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.settings"))

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                            Text(localization.t("shabbat.autoMode"))
                                .font(.system(size: DesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)

                            Text(localization.t("shabbat.autoModeDescription"))
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }

                        Spacer()

                        Toggle(
                            "",
                            isOn: Bindable(vm).autoModeEnabled
                        )
                        .tint(DesignTokens.Primary.default)
                        .labelsHidden()
                    }

                    divider

                    HStack {
                        Text(localization.t("shabbat.manualToggle"))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Spacer()

                        GlassButton(
                            vm.isShabbatActive
                                ? localization.t("shabbat.deactivate")
                                : localization.t("shabbat.activate"),
                            variant: vm.isShabbatActive ? .destructive : .primary,
                            size: .small
                        ) {
                            vm.toggleShabbatMode()
                        }
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func contentSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.recommendedContent"))

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.shabbatContent) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            subtitle: item.category,
                            aspectRatio: 16 / 9,
                            width: 240,
                            onTap: {}
                        )
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
            .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
