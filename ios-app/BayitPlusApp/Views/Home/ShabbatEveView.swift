import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Shabbat Eve section (Friday before candle lighting) with countdown and quick actions.
/// Shows preparation content: songs, parasha, recipes, prayers.
struct ShabbatEveView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State var viewModel: ShabbatViewModel?
    @State var countdown: String = ""
    @State var timer: Timer?

    var body: some View {
        if let vm = viewModel, shouldShowSection(vm) {
            sectionContent(vm)
                .onAppear {
                    startCountdownTimer(vm)
                }
                .onDisappear {
                    stopCountdownTimer()
                }
        }
    }

    // MARK: - Section Content

    private func sectionContent(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            // Header with candle emoji and countdown
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text("🕯️")
                            .font(.system(size: DesignTokens.FontSize.xxl))

                        Text(localization.t("judaism.erevShabbat.title"))
                            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    if let parasha = getParasha(vm) {
                        Text(localization.t("shabbat.parashat", ["name": parasha]))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()

                // Countdown
                if !countdown.isEmpty {
                    VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
                        Text(localization.t("judaism.erevShabbat.candlesIn"))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(countdown)
                            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                            .foregroundStyle(DesignTokens.Warning.default)
                    }
                }
            }

            // Quick action buttons
            HStack(spacing: DesignTokens.Spacing.sm) {
                quickActionButton(
                    icon: "music.note",
                    label: localization.t("judaism.erevShabbat.songs"),
                    color: DesignTokens.Warning.default
                ) {
                    coordinator.navigate(to: .judaism)
                }

                quickActionButton(
                    icon: "book.fill",
                    label: localization.t("judaism.erevShabbat.parasha"),
                    color: DesignTokens.Primary.p400
                ) {
                    coordinator.navigate(to: .judaism)
                }

                quickActionButton(
                    icon: "fork.knife",
                    label: localization.t("judaism.erevShabbat.recipes"),
                    color: DesignTokens.Success.default
                ) {
                    coordinator.navigate(to: .judaism)
                }

                quickActionButton(
                    icon: "sparkles",
                    label: localization.t("judaism.erevShabbat.prayers"),
                    color: DesignTokens.Primary.p400
                ) {
                    coordinator.navigate(to: .judaism)
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [
                    DesignTokens.Warning.default.opacity(0.15),
                    DesignTokens.Primary.p400.opacity(0.1),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
        }
    }

    // MARK: - Quick Action Button

    private func quickActionButton(
        icon: String,
        label: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(color)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }
}
