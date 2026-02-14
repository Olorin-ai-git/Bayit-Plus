import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct CulturalExplanationSheet: View {
    @Environment(LocalizationManager.self) private var localization
    let data: CulturalExplanationData
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            headerSection
            Divider().background(DesignTokens.Glass.border.opacity(0.3))
            explanationSection
            Spacer()
            dismissButton
        }
        .padding(DesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium.opacity(0.95))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .presentationDetents([.medium])
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack {
                Text(data.canonicalName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(DesignTokens.Text.primary)
                    .environment(\.layoutDirection, .rightToLeft)
                Spacer()
                categoryBadge
            }
            Text(data.canonicalNameEn)
                .font(.headline)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private var categoryBadge: some View {
        HStack(spacing: DesignTokens.Spacing.xxs) {
            Text(data.category.capitalized)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Primary.p400)
            if !data.subcategory.isEmpty {
                Text("/ \(data.subcategory)")
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xxs)
        .background(DesignTokens.Primary.p400.opacity(0.15))
        .clipShape(Capsule())
    }

    private var explanationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if !data.shortExplanation.isEmpty {
                Text(data.shortExplanation)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Text.primary)
                    .environment(\.layoutDirection, .rightToLeft)
            }

            if !data.shortExplanationEn.isEmpty {
                Text(data.shortExplanationEn)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

    private var dismissButton: some View {
        Button {
            onDismiss()
        } label: {
            Text(localization.t("common.close"))
                .font(.callout)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Primary.default)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        }
        .buttonStyle(.plain)
    }
}
