import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Step 3: Review duplicates and unresolved channels.
struct BYOCContentPruningStep: View {
    @Environment(LocalizationManager.self) private var localization

    let plan: NormalizationPlan?
    let onContinue: () -> Void
    let onSkip: () -> Void

    @State private var autoSelectBest = true

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("byoc.onboarding.cleanupTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let plan, !plan.duplicates.isEmpty {
                duplicateSection(plan.duplicates)
            }

            Spacer()

            HStack(spacing: DesignTokens.Spacing.md) {
                Button {
                    onSkip()
                } label: {
                    Text(localization.t("common.skip"))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(DesignTokens.Background.elevated)
                        .foregroundStyle(DesignTokens.Text.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    onContinue()
                } label: {
                    Text(localization.t("byoc.onboarding.applyCleanup"))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(DesignTokens.Primary.default)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
    }

    private func duplicateSection(
        _ duplicates: [DuplicateGroup]
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Toggle(isOn: $autoSelectBest) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("byoc.onboarding.autoBestQuality"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("byoc.onboarding.autoBestQualityDesc"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .tint(DesignTokens.Primary.default)
            .padding()
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(
                        Array(duplicates.prefix(20).enumerated()),
                        id: \.offset
                    ) { _, group in
                        duplicateRow(group)
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    private func duplicateRow(_ group: DuplicateGroup) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(group.canonicalName)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                Text("\(group.alternateIndices.count + 1) feeds")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            Spacer()
            if let res = group.primaryResolution {
                Text(res)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(DesignTokens.Primary.default.opacity(0.2))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .clipShape(Capsule())
            }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Background.elevated)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
