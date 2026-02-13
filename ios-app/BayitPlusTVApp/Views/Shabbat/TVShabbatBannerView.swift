import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Shabbat banner with countdown, candle-lighting time, and parasha.
///
/// Unlike the iOS overlay banner, this is a **focusable Button** so it
/// participates in the tvOS focus engine. On select, it navigates to
/// `TVZmanimView` for full Shabbat details.
struct TVShabbatBannerView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ShabbatViewModel?

    var body: some View {
        if let vm = viewModel, shouldShowBanner(vm) {
            NavigationLink {
                TVZmanimView()
            } label: {
                bannerContent(vm)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    // MARK: - Banner Content

    private func bannerContent(_ vm: ShabbatViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "flame.fill")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Primary.p400)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                if let countdown = vm.countdown,
                   let label = vm.countdownLabel {
                    Text("\(countdown) \(label)")
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                if let candleTime = vm.candleLightingTime {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "candle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Warning.default)
                        Text(candleTime)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }

            Spacer()

            parashaLabel(vm)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.purpleGlow, lineWidth: 2)
        )
    }

    // MARK: - Parasha Label

    private func parashaLabel(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xxs) {
            if let hebrew = vm.parashaNameHebrew {
                Text(hebrew)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }
            if let english = vm.parashaNameEnglish {
                Text(english)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    // MARK: - Logic

    private func shouldShowBanner(_ vm: ShabbatViewModel) -> Bool {
        vm.isShabbatActive ||
        vm.countdown != nil ||
        vm.candleLightingTime != nil
    }
}

// MARK: - Auto Load Extension

extension TVShabbatBannerView {
    /// Creates the ViewModel from TVRepositoryProvider and loads zmanim data.
    func withAutoLoad() -> some View {
        self.task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
        }
    }
}
