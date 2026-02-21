import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Zmanim view showing Shabbat status, daily times, settings, and content.
///
/// Port of the iOS `ZmanimView` following the TVJudaismView pattern.
/// Toggle and manual toggle button are placed in separate `.focusSection()`
/// containers to prevent focus traps in the ScrollView.
struct TVZmanimView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: ShabbatViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.zmanimData == nil {
                    loadingState
                } else if let error = vm.error, vm.zmanimData == nil {
                    tvErrorState(error) {
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
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            TVPageHeader(
                icon: "flame.fill",
                title: localization.t("judaism.shabbat.title")
            )
            statusSection(vm)
            zmanimTimesSection(vm)
            settingsSection(vm)
            if !vm.shabbatContent.isEmpty {
                contentSection(vm)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Status

    private func statusSection(_ vm: ShabbatViewModel) -> some View {
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

    private func zmanimTimesSection(_ vm: ShabbatViewModel) -> some View {
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

    private func zmanimRow(
        icon: String,
        label: String,
        time: String,
        color: Color
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(color)
                .frame(width: 36)

            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(time)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: .semibold,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, TVDesignTokens.Spacing.md)
    }
}
