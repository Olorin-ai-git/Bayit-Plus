import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Shabbat Eve section (Friday before candle lighting).
/// Shows preparation content with countdown and focusable navigation buttons.
struct TVShabbatEveView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ShabbatViewModel?
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
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            // Header with countdown
            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.lg) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Text("🕯️")
                            .font(.system(size: TVDesignTokens.FontSize.xxxl))

                        Text(localization.t("judaism.erevShabbat.title"))
                            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    if let parasha = getParasha(vm) {
                        Text("Parashat \(parasha)")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()

                // Countdown
                if !countdown.isEmpty {
                    VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xs) {
                        Text(localization.t("judaism.erevShabbat.candlesIn"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(countdown)
                            .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                            .foregroundStyle(DesignTokens.Warning.default)
                            .monospacedDigit()
                    }
                }
            }

            // Quick action buttons (focusable for tvOS)
            HStack(spacing: TVDesignTokens.Spacing.md) {
                quickActionButton(
                    icon: "music.note",
                    label: localization.t("judaism.erevShabbat.songs"),
                    color: DesignTokens.Warning.default
                ) {
                    coordinator.navigate(to: .judaism(category: "music"))
                }

                quickActionButton(
                    icon: "book.fill",
                    label: localization.t("judaism.erevShabbat.parasha"),
                    color: DesignTokens.Primary.p400
                ) {
                    coordinator.navigate(to: .judaism(category: "shiurim"))
                }

                quickActionButton(
                    icon: "fork.knife",
                    label: localization.t("judaism.erevShabbat.recipes"),
                    color: DesignTokens.Success.default
                ) {
                    coordinator.navigate(to: .judaism(category: "holidays"))
                }

                quickActionButton(
                    icon: "sparkles",
                    label: localization.t("judaism.erevShabbat.prayers"),
                    color: DesignTokens.Colors.Primary.base
                ) {
                    coordinator.navigate(to: .judaism(category: "tefila"))
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [
                    DesignTokens.Warning.default.opacity(0.2),
                    DesignTokens.Primary.p400.opacity(0.15),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                .stroke(DesignTokens.Glass.border, lineWidth: 2)
        )
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
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
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(color)

                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
