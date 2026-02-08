import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen Zmanim view showing daily times, Shabbat status,
/// Shabbat content recommendations, and auto-mode toggle.
struct ZmanimView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ShabbatViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.zmanimData == nil {
                    ProgressView()
                        .tint(.white)
                        .padding(.top, DesignTokens.Spacing.xxxxl)
                } else if let error = vm.error, vm.zmanimData == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadZmanim() }
                    }
                } else {
                    content(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
            await viewModel?.loadShabbatContent()
        }
    }

    // MARK: - Content

    private func content(_ vm: ShabbatViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            statusSection(vm)
            zmanimTimesSection(vm)
            settingsSection(vm)
            if !vm.shabbatContent.isEmpty {
                contentSection(vm)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Status

    private func statusSection(_ vm: ShabbatViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: vm.isShabbatActive ? "flame.fill" : "moon.stars")
                        .font(.system(size: DesignTokens.FontSize.xxxl))
                        .foregroundStyle(
                            vm.isShabbatActive
                                ? DesignTokens.Warning.default
                                : DesignTokens.Primary.p400
                        )

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(
                            vm.isShabbatActive
                                ? localization.t("shabbat.active")
                                : localization.t("shabbat.inactive")
                        )
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                        if let countdown = vm.countdown,
                           let label = vm.countdownLabel {
                            Text("\(countdown) \(label)")
                                .font(.system(size: DesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }

                    Spacer()
                }

                if let hebrew = vm.parashaNameHebrew {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "book.fill")
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Primary.p400)

                        VStack(alignment: .leading, spacing: 0) {
                            Text(hebrew)
                                .font(.system(
                                    size: DesignTokens.FontSize.md,
                                    weight: .semibold
                                ))
                                .foregroundStyle(DesignTokens.Text.primary)

                            if let english = vm.parashaNameEnglish {
                                Text(english)
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.muted)
                            }
                        }

                        Spacer()
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Zmanim Times

    private func zmanimTimesSection(_ vm: ShabbatViewModel) -> some View {
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

    private func zmanimRow(
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

    private var divider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(height: 1)
    }

    // MARK: - Settings

    private func settingsSection(_ vm: ShabbatViewModel) -> some View {
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

    // MARK: - Content

    private func contentSection(_ vm: ShabbatViewModel) -> some View {
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
                            width: 240
                        ) {}
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
            .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
