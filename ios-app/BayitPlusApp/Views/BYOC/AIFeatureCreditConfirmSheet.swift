import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Confirmation sheet shown before deducting an AI credit for a VOD feature.
struct AIFeatureCreditConfirmSheet: View {
    let feature: VODAIFeature
    let currentBalance: Int
    let onConfirm: () -> Void
    let onCancel: () -> Void

    @Environment(LocalizationManager.self) private var localization

    private var remainingAfter: Int {
        max(0, currentBalance - 1)
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            featureInfo
            Divider().background(DesignTokens.Glass.border)
            balanceBreakdown
            actionButtons
        }
        .padding(DesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .presentationDetents([.height(300)])
    }

    private var featureInfo: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: feature.icon)
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 48, height: 48)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(localization.t(feature.nameKey))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t(feature.descriptionKey))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var balanceBreakdown: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            balanceRow(
                label: localization.t("byoc.ai.confirm.currentBalance"),
                value: "\(currentBalance)",
                color: DesignTokens.Text.primary
            )
            balanceRow(
                label: localization.t("byoc.ai.confirm.cost"),
                value: "-1",
                color: DesignTokens.ErrorColor.default
            )
            balanceRow(
                label: localization.t("byoc.ai.confirm.remainingAfter"),
                value: "\(remainingAfter)",
                color: remainingAfter > 0
                    ? DesignTokens.Success.default
                    : DesignTokens.Warning.default
            )
        }
    }

    private func balanceRow(
        label: String, value: String, color: Color
    ) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(color)
        }
    }

    private var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("byoc.ai.confirm.cancel"),
                variant: .ghost,
                size: .medium
            ) { onCancel() }

            GlassButton(
                localization.t("byoc.ai.confirm.button"),
                variant: .primary,
                size: .medium
            ) { onConfirm() }
        }
    }
}
