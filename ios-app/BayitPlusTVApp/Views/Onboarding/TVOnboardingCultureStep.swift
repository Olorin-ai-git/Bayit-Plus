import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Culture preference selection step.
/// Users select their primary cultural context for content recommendations.
struct TVOnboardingCultureStep: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TVOnboardingViewModel

    private let cultureOptions: [(id: String, icon: String, gradient: [Color])] = [
        ("israeli", "building.columns", [.blue, .white]),
        ("american", "star.fill", [.red, .blue]),
        ("european", "globe.europe.africa", [.indigo, .purple]),
        ("mixed", "globe", [.teal, .cyan]),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Spacer()

            headerSection

            cultureGrid

            Spacer()

            navigationButtons
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.culture.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.culture.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Culture Grid

    private var cultureGrid: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(cultureOptions, id: \.id) { option in
                cultureCard(option: option)
            }
        }
    }

    private func cultureCard(
        option: (id: String, icon: String, gradient: [Color])
    ) -> some View {
        let isSelected = viewModel.selectedCulture == option.id

        return Button {
            viewModel.selectedCulture = option.id
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                ZStack {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(
                            LinearGradient(
                                colors: option.gradient.map { $0.opacity(0.3) },
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 200, height: 200)

                    Image(systemName: option.icon)
                        .font(.system(size: 72))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Text.secondary
                        )
                }

                Text(localization.t("onboarding.culture.\(option.id)"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .fill(isSelected ? DesignTokens.Primary.p400.opacity(0.1) : DesignTokens.Glass.bgLight)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(
                        isSelected ? DesignTokens.Primary.p400 : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
        }
        .tvCardStyle()
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
                isDisabled: viewModel.selectedCulture == nil,
                icon: Image(systemName: "arrow.right")
            ) {
                viewModel.nextStep()
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
