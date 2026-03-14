import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subscription page matching the Bayit+ Premium design.
/// Uses a fixed VStack (no ScrollView) to prevent tvOS focus engine
/// from targeting non-interactive glass cards. The only focusable
/// element is the Done button at the bottom.
struct TVSubscriptionView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: SubscriptionViewModel?
    @State private var creditBalance: CreditBalance?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                headerSection
                creditBar
                featureCards
                ctaSection
            }
            .frame(maxWidth: 1100)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .task {
            if viewModel == nil {
                viewModel = SubscriptionViewModel(
                    storeManager: repos.storeManager,
                    localization: localization
                )
            }
            await viewModel?.load()
            creditBalance = try? await repos.betaCredits.fetchBalance()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "crown.fill")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color(red: 1.0, green: 0.84, blue: 0.0),
                            Color(red: 0.85, green: 0.65, blue: 0.0),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .shadow(
                    color: Color(red: 1.0, green: 0.84, blue: 0.0)
                        .opacity(0.5),
                    radius: 16
                )
                .shadow(
                    color: Color(red: 1.0, green: 0.84, blue: 0.0)
                        .opacity(0.25),
                    radius: 32
                )

            Text(localization.t("subscription.title"))
                .font(.system(size: 44, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("subscription.gate.upgradeList"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Credit Balance Bar

    @ViewBuilder
    private var creditBar: some View {
        if let balance = creditBalance {
            let remaining = balance.remainingCredits ?? 0
            let total = balance.totalCredits ?? 0
            let progress = total > 0
                ? Double(remaining) / Double(total) : 0
            let barColor = creditColor(remaining: remaining, total: total)

            VStack(alignment: .leading, spacing: 6) {
                Text(localization.t(
                    "plus.badge.creditsRemaining",
                    ["count": String(remaining)]
                ))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(barColor)
                            .frame(
                                width: geo.size.width * progress,
                                height: 8
                            )
                    }
                }
                .frame(height: 8)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .frame(maxWidth: 550)
        }
    }

    private func creditColor(remaining: Int, total: Int) -> Color {
        if remaining <= 0 { return DesignTokens.ErrorColor.default }
        guard total > 0 else { return DesignTokens.Success.default }
        let ratio = Double(remaining) / Double(total)
        if ratio < 0.1 { return DesignTokens.ErrorColor.default }
        if ratio < 0.25 { return DesignTokens.Warning.default }
        return DesignTokens.Success.default
    }

    // MARK: - Feature Cards

    private var featureCards: some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xl) {
            basicCard
            premiumCard
        }
    }

    private var basicCard: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "person.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("profile.basic"))
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                bulletRow(localization.t(
                    "settings.subscription.featureAIFree"
                ))
                bulletRow(localization.t(
                    "settings.subscription.featureWidgetsFree"
                ))
                bulletRow(localization.t(
                    "settings.subscription.featureProfilesFree"
                ))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private var premiumCard: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(localization.t("profile.premium"))
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                bulletRow(localization.t(
                    "settings.subscription.featureAIPlus"
                ))
                bulletRow(localization.t(
                    "settings.subscription.featureWidgetsPlus"
                ))
                bulletRow(localization.t(
                    "settings.subscription.featureProfilesPlus"
                ))
                bulletRow(localization.t(
                    "settings.subscription.featureSupport"
                ))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.xl)
        .background(
            DesignTokens.Glass.bgLight
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400.opacity(0.6),
                            DesignTokens.Primary.p400,
                            DesignTokens.Primary.p400.opacity(0.8),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 2.5
                )
        )
        .shadow(
            color: DesignTokens.Primary.p400.opacity(0.4),
            radius: 24
        )
        .shadow(
            color: DesignTokens.Primary.p400.opacity(0.2),
            radius: 48
        )
    }

    private func bulletRow(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("\u{2022}")
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - CTA

    private var ctaSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "iphone")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text(localization.t("subscription.tvSubscribeMessage"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text("bayit.tv")
                    .font(.system(
                        size: TVDesignTokens.FontSize.base, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }

            GlassButton(
                localization.t("common.done"),
                variant: .secondary,
                size: .large
            ) {
                dismiss()
            }
            .frame(maxWidth: 300)
        }
    }
}
