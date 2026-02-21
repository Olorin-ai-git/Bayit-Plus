import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen Zmanim view showing daily times, Shabbat status,
/// Shabbat content recommendations, and auto-mode toggle.
struct ZmanimView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
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
            ZmanimTimesSection(
                candleLightingTime: vm.candleLightingTime,
                havdalahTime: vm.havdalahTime
            )
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
                           let label = vm.countdownLabel
                        {
                            Text("\(countdown) \(label)")
                                .font(.system(size: DesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }

                    Spacer()
                }

                if let hebrew = vm.parashaNameHebrew {
                    parashaRow(hebrew: hebrew, english: vm.parashaNameEnglish)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func parashaRow(hebrew: String, english: String?) -> some View {
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

                if let english {
                    Text(english)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            Spacer()
        }
    }
}
