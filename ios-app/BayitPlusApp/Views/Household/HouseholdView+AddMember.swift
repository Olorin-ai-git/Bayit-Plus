import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Create Household & Add Member Sections

extension HouseholdView {
    func createHouseholdSection(_ vm: HouseholdViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: "house.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("household.createTitle"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(localization.t("household.createDescription"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassTextField(
                    localization.t("household.householdName"),
                    text: Binding(
                        get: { vm.newHouseholdName },
                        set: { vm.newHouseholdName = $0 }
                    )
                )

                if let error = vm.error {
                    Text(error)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }

                GlassButton(
                    localization.t("household.create"),
                    variant: .primary,
                    isLoading: vm.isCreating
                ) {
                    Task { await vm.createHousehold() }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func addMemberSection(_ vm: HouseholdViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("household.inviteMember"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassTextField(
                    localization.t("household.emailPlaceholder"),
                    text: Binding(
                        get: { vm.inviteEmail },
                        set: { vm.inviteEmail = $0 }
                    )
                )
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .autocapitalization(.none)

                rolePicker(vm)

                if let error = vm.error {
                    Text(error)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }

                if vm.inviteSent {
                    Text(localization.t("household.invitationSent"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Success.default)
                }

                GlassButton(
                    localization.t("household.sendInvitation"),
                    variant: .primary,
                    isLoading: vm.isInviting
                ) {
                    HapticFeedbackService.impact(style: .medium)
                    Task { await vm.inviteMember() }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func rolePicker(_ vm: HouseholdViewModel) -> some View {
        HStack(spacing: 0) {
            roleButton("child", label: localization.t("household.roleChild"), vm: vm)
            roleButton("parent", label: localization.t("household.roleParent"), vm: vm)
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.xs)
    }

    func roleButton(
        _ role: String, label: String, vm: HouseholdViewModel
    ) -> some View {
        let isSelected = vm.inviteRole == role

        return Button {
            vm.inviteRole = role
        } label: {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }
}
