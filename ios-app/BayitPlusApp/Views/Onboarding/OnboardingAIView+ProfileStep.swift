import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Step 4: Profile Creation

extension OnboardingAIView {
    func profileCreationStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.profileTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    GlassTextField(
                        localization.t("onboarding.namePlaceholder"),
                        text: Binding(
                            get: { vm.displayName },
                            set: { vm.displayName = $0 }
                        ),
                        icon: Image(systemName: "person")
                    )

                    avatarPicker(vm)
                }
            }
        }
    }

    func avatarPicker(_ vm: OnboardingAIViewModel) -> some View {
        let avatarIcons = [
            "person.circle.fill", "star.circle.fill",
            "heart.circle.fill", "moon.circle.fill",
            "sun.max.circle.fill", "leaf.circle.fill",
        ]

        return VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.chooseAvatar"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(avatarIcons, id: \.self) { icon in
                    let isSelected = vm.selectedAvatar == icon
                    Button {
                        HapticFeedbackService.selection()
                        vm.selectedAvatar = icon
                    } label: {
                        Image(systemName: icon)
                            .font(.system(size: 32))
                            .foregroundStyle(
                                isSelected
                                    ? DesignTokens.Primary.p400
                                    : DesignTokens.Text.muted
                            )
                            .padding(DesignTokens.Spacing.sm)
                            .background(
                                isSelected
                                    ? DesignTokens.Glass.purpleLight
                                    : Color.clear
                            )
                            .clipShape(Circle())
                    }
                }
            }
        }
    }
}
