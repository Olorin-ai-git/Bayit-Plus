#if os(tvOS)

    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Plan Card & Action Buttons

    extension TVSubscriptionGateView {
        func planCard(_ plan: SubscriptionPlan, isRecommended: Bool) -> some View {
            let isSelected = selectedPlanId == plan.id

            return Button {
                selectedPlanId = plan.id
            } label: {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                    if isRecommended {
                        HStack {
                            Spacer()
                            Text(localization.t("subscription.recommended"))
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .padding(.horizontal, TVDesignTokens.Spacing.md)
                                .padding(.vertical, TVDesignTokens.Spacing.sm)
                                .background(DesignTokens.Glass.purpleLight)
                                .clipShape(Capsule())
                            Spacer()
                        }
                    }

                    Text(plan.name)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(String(format: "$%.2f", plan.price))
                        .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Glass.purpleLight)

                    if !plan.features.isEmpty {
                        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                            ForEach(plan.features, id: \.self) { feature in
                                HStack(alignment: .top, spacing: TVDesignTokens.Spacing.sm) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: TVDesignTokens.FontSize.sm))
                                        .foregroundStyle(DesignTokens.Glass.purpleLight)

                                    Text(feature)
                                        .font(.system(size: TVDesignTokens.FontSize.md))
                                        .foregroundStyle(DesignTokens.Text.secondary)
                                        .multilineTextAlignment(.leading)
                                }
                            }
                        }
                    }

                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.lg)
                .frame(width: 450, height: 550)
                .background(isSelected ? DesignTokens.Glass.bgLight : DesignTokens.Background.elevated)
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .stroke(isSelected ? DesignTokens.Glass.purpleLight : Color.clear, lineWidth: 4)
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        var actionButtonsSection: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Button {
                    handleRestorePurchase()
                } label: {
                    Text(localization.t("subscription.restorePurchase"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .frame(maxWidth: .infinity)
                        .background(DesignTokens.Background.elevated)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
            }
        }

        func handleRestorePurchase() {
            // StoreKit restore handled at app level
        }
    }

#endif
