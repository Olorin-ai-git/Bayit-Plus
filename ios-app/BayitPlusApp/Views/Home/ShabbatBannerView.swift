import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iOS Shabbat banner with countdown, candle-lighting time, and parasha.
/// Displays during Shabbat hours with real-time countdown timer.
struct ShabbatBannerView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ShabbatViewModel?
    @State private var isDismissed = false

    var body: some View {
        if let vm = viewModel, shouldShowBanner(vm), !isDismissed {
            bannerContent(vm)
                .transition(.opacity)
        }
    }

    // MARK: - Banner Content

    private func bannerContent(_ vm: ShabbatViewModel) -> some View {
        ZStack(alignment: .topTrailing) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "flame.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p400)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text("Shabbat Shalom")
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let parasha = getParasha(vm) {
                        Text("Parashat \(parasha)")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
                    if let countdown = vm.countdown,
                       let label = vm.countdownLabel {
                        Text(label)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(countdown)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    if let candleTime = vm.candleLightingTime {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "candle.fill")
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Warning.default)
                            Text(formatTime(candleTime))
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [
                        DesignTokens.Primary.p600.opacity(0.3),
                        DesignTokens.Primary.p400.opacity(0.2)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )

            // Dismiss button
            Button {
                withAnimation {
                    isDismissed = true
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(DesignTokens.Spacing.xs)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
        }
    }

    // MARK: - Helpers

    private func shouldShowBanner(_ vm: ShabbatViewModel) -> Bool {
        vm.isShabbatActive ||
        vm.countdown != nil ||
        vm.candleLightingTime != nil
    }

    private func getParasha(_ vm: ShabbatViewModel) -> String? {
        let locale = Locale.current.language.languageCode?.identifier ?? "en"
        if locale == "he", let hebrewName = vm.parashaNameHebrew {
            return hebrewName
        }
        return vm.parashaNameEnglish
    }

    private func formatTime(_ timeStr: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: timeStr) else {
            return timeStr
        }

        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return formatter.string(from: date)
    }
}
