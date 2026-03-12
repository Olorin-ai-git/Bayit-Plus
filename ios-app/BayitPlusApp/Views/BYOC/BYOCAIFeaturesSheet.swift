import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Glass sheet listing all 7 VOD AI features with credit state awareness.
struct BYOCAIFeaturesSheet: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss

    @State private var balance: CreditBalance?

    private var isPlus: Bool {
        authManager.user?.subscriptionTier == .plus
    }

    private var remainingCredits: Int {
        balance?.remainingCredits ?? 0
    }

    private var hasCredits: Bool {
        isPlus || remainingCredits > 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    header
                    featuresList
                    if !isPlus && remainingCredits <= 0 && balance != nil {
                        upgradeCTA
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .task { await loadBalance() }
    }

    private var header: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(localization.t("byoc.ai.featuresTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
        }
    }

    private var featuresList: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(VODAIFeature.allCases) { feature in
                featureRow(feature)
            }
        }
    }

    private func featureRow(_ feature: VODAIFeature) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: feature.icon)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(localization.t(feature.nameKey))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t(feature.descriptionKey))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
            }

            Spacer()

            creditPill
        }
        .padding(DesignTokens.Spacing.sm)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
        .opacity(hasCredits ? 1.0 : 0.4)
    }

    private var creditPill: some View {
        Text(isPlus
            ? localization.t("byoc.ai.included")
            : localization.t("byoc.ai.creditCost"))
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundStyle(isPlus
                ? DesignTokens.Success.default
                : DesignTokens.Primary.p400)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(
                (isPlus
                    ? DesignTokens.Success.default
                    : DesignTokens.Primary.p400).opacity(0.15)
            )
            .cornerRadius(12)
    }

    private var upgradeCTA: some View {
        GlassButton(
            localization.t("byoc.ai.upgradeToUnlock"),
            variant: .primary,
            size: .large
        ) {
            dismiss()
            coordinator.navigate(to: .subscription)
        }
    }

    private func loadBalance() async {
        do {
            balance = try await repos.betaCredits.fetchBalance()
        } catch {
            balance = CreditBalance(
                remainingCredits: 0,
                totalCredits: 0,
                usedCredits: 0,
                isLow: true,
                isCritical: true
            )
        }
    }
}
