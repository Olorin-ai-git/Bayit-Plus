import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Members Section

extension HouseholdView {
    func membersSection(_ vm: HouseholdViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("household.members"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if let members = vm.household?.members {
                ForEach(members, id: \.stableId) { member in
                    memberRow(member, viewModel: vm)
                }
            }
        }
    }

    func memberRow(
        _ member: HouseholdMember,
        viewModel vm: HouseholdViewModel
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                avatarView(member)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text(member.displayName ?? "?")
                            .font(.system(
                                size: DesignTokens.FontSize.base,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if vm.isOwner(member) {
                            GlassBadge(
                                text: localization.t("household.roleParent"),
                                variant: .primary
                            )
                        }
                    }

                    if let role = member.role {
                        Text(role)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                if !vm.isOwner(member) {
                    Button {
                        HapticFeedbackService.notification(type: .warning)
                        Task { await vm.removeMember(member) }
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func avatarView(_ member: HouseholdMember) -> some View {
        Group {
            if let avatarUrl = member.avatar, let url = URL(string: avatarUrl) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().scaledToFill()
                    default:
                        avatarPlaceholderView(member)
                    }
                }
            } else {
                avatarPlaceholderView(member)
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
    }

    func avatarPlaceholderView(_ member: HouseholdMember) -> some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .overlay(
                Text(String((member.displayName ?? "?").prefix(1)).uppercased())
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            )
    }
}
