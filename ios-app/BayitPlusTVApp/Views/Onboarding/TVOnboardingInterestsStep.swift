import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Content interest selection step with multi-select grid.
/// Minimum 3 selections required to proceed.
struct TVOnboardingInterestsStep: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TVOnboardingViewModel

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    private let minimumSelections = 3

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            headerSection

            interestsGrid

            selectionCounter

            Spacer()

            navigationButtons
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.interests.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.interests.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Grid

    private var interestsGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(TVContentInterest.allCases) { interest in
                interestCard(interest)
            }
        }
    }

    private func interestCard(_ interest: TVContentInterest) -> some View {
        let isSelected = viewModel.selectedInterests.contains(interest)

        return Button {
            viewModel.toggleInterest(interest)
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: interest.iconName)
                    .font(.system(size: 44))
                    .foregroundStyle(
                        isSelected
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.secondary
                    )

                Text(localization.t(interest.localizationKey))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .fill(
                        isSelected
                            ? DesignTokens.Primary.p400.opacity(0.15)
                            : DesignTokens.Glass.bgLight
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        isSelected ? DesignTokens.Primary.p400 : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .overlay(alignment: .topTrailing) {
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .offset(x: -TVDesignTokens.Spacing.sm, y: TVDesignTokens.Spacing.sm)
                }
            }
        }
        .tvCardStyle()
    }

    // MARK: - Counter

    private var selectionCounter: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: viewModel.canProceedFromInterests ? "checkmark.circle.fill" : "info.circle")
                .foregroundStyle(
                    viewModel.canProceedFromInterests
                        ? DesignTokens.Success.default
                        : DesignTokens.Text.muted
                )

            Text(
                String(
                    format: localization.t("onboarding.interests.selected"),
                    viewModel.selectedInterests.count,
                    minimumSelections
                )
            )
            .font(.system(size: TVDesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("common.back"),
                variant: .secondary,
                size: .medium
            ) {
                viewModel.previousStep()
            }

            GlassButton(
                localization.t("common.next"),
                variant: .primary,
                size: .medium,
                isDisabled: !viewModel.canProceedFromInterests,
                icon: Image(systemName: "arrow.right")
            ) {
                viewModel.nextStep()
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
