import BayitDesignSystem
import SwiftUI

struct CulturalExplanationData {
    let referenceId: String
    let canonicalName: String
    let canonicalNameEn: String
    let category: String
    let subcategory: String
    let shortExplanation: String
    let shortExplanationEn: String
    let imageUrl: String?
}

struct CulturalExplanationSheet: View {
    let data: CulturalExplanationData
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            headerSection
            Divider().background(DesignTokens.Colors.border.opacity(0.3))
            explanationSection
            Spacer()
            dismissButton
        }
        .padding(DesignTokens.Spacing.lg)
        .background(DesignTokens.Colors.surface.opacity(0.95))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xxl))
        .presentationDetents([.medium])
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack {
                Text(data.canonicalName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .environment(\.layoutDirection, .rightToLeft)
                Spacer()
                categoryBadge
            }
            Text(data.canonicalNameEn)
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }

    private var categoryBadge: some View {
        HStack(spacing: DesignTokens.Spacing.xxs) {
            Text(data.category.capitalized)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Colors.primaryAccent)
            if !data.subcategory.isEmpty {
                Text("/ \(data.subcategory)")
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xxs)
        .background(DesignTokens.Colors.primaryAccent.opacity(0.15))
        .clipShape(Capsule())
    }

    private var explanationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if !data.shortExplanation.isEmpty {
                Text(data.shortExplanation)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .environment(\.layoutDirection, .rightToLeft)
            }

            if !data.shortExplanationEn.isEmpty {
                Text(data.shortExplanationEn)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
        }
    }

    private var dismissButton: some View {
        Button(action: onDismiss) {
            Text("Close")
                .font(.callout)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Colors.primaryAccent)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
        }
        .buttonStyle(.plain)
    }
}
