import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Zmanim view showing Shabbat status, daily times, settings, and content.
///
/// Port of the iOS `ZmanimView` following the TVJudaismView pattern.
/// Toggle and manual toggle button are placed in separate `.focusSection()`
/// containers to prevent focus traps in the ScrollView.
struct TVZmanimView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
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
                       let label = vm.countdownLabel {
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

    private var divider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(height: 1)
    }

    // MARK: - Settings

    private func settingsSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.settings"))

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                // Auto-mode toggle in its own focus section
                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    HStack {
                        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                            Text(localization.t("shabbat.autoMode"))
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Text.primary)

                            Text(localization.t("shabbat.autoModeDescription"))
                                .font(.system(size: TVDesignTokens.FontSize.sm))
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
                }
                .focusSection()

                divider

                // Manual toggle in its own focus section
                HStack {
                    Text(localization.t("shabbat.manualToggle"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    GlassButton(
                        vm.isShabbatActive
                            ? localization.t("shabbat.deactivate")
                            : localization.t("shabbat.activate"),
                        variant: vm.isShabbatActive ? .destructive : .primary,
                        size: .large
                    ) {
                        vm.toggleShabbatMode()
                    }
                }
                .focusSection()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    // MARK: - Content

    private func contentSection(_ vm: ShabbatViewModel) -> some View {
        GlassContentShelf(
            title: localization.t("shabbat.recommendedContent"),
            items: vm.shabbatContent
        ) { item in
            GlassFocusPoster(
                thumbnailURL: item.thumbnail,
                title: item.title,
                subtitle: item.category,
                aspectRatio: 16 / 9,
                onSelect: {
                    coordinator.presentPlayer(
                        contentId: item.id,
                        contentType: TVContentTypeMapper.map(item.type)
                    )
                }
            )
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
