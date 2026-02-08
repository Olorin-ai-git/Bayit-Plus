import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Overlay banner showing Shabbat countdown, candle-lighting time,
/// and parasha name. Slides in from the top with a purple glow border.
struct ShabbatBannerView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ShabbatViewModel?
    @State private var isVisible = false

    var body: some View {
        if let vm = viewModel, shouldShowBanner(vm) {
            bannerContent(vm)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onAppear {
                    withAnimation(.spring(duration: 0.5, bounce: 0.2)) {
                        isVisible = true
                    }
                }
        }
    }

    private func bannerContent(_ vm: ShabbatViewModel) -> some View {
        GlassCard(radius: DesignTokens.Radius.lg) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        if let countdown = vm.countdown,
                           let label = vm.countdownLabel {
                            Text("\(countdown) \(label)")
                                .font(.system(
                                    size: DesignTokens.FontSize.md,
                                    weight: .bold
                                ))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }

                        if let candleTime = vm.candleLightingTime {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "candle.fill")
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Warning.default)
                                Text(candleTime)
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                        }
                    }

                    Spacer()

                    parashaLabel(vm)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.purpleGlow, lineWidth: 2)
        )
        .shadow(
            color: DesignTokens.Glass.purpleGlow,
            radius: 8,
            x: 0,
            y: 4
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.sm)
    }

    private func parashaLabel(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
            if let hebrew = vm.parashaNameHebrew {
                Text(hebrew)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }
            if let english = vm.parashaNameEnglish {
                Text(english)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private func shouldShowBanner(_ vm: ShabbatViewModel) -> Bool {
        vm.isShabbatActive ||
        vm.countdown != nil ||
        vm.candleLightingTime != nil
    }
}

extension ShabbatBannerView {
    /// Initializer that auto-creates the ViewModel from the environment.
    /// Call `.task { }` on the parent to trigger data loading.
    func withAutoLoad() -> some View {
        self.task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
        }
    }
}
