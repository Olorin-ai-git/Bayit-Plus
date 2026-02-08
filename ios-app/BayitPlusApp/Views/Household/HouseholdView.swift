import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Household management screen with member list, add/remove functionality,
/// and owner badge indicators.
struct HouseholdView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: HouseholdViewModel?
    @State private var showingAddMember = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.household == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.household == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        householdHeader(vm)
                        membersSection(vm)
                        addMemberSection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = HouseholdViewModel(repository: repos.household)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Header

    private func householdHeader(_ vm: HouseholdViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "house.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(vm.household?.name ?? localization.t("household.myHousehold"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(
                    "\(vm.memberCount) / \(vm.maxProfiles) \(localization.t("household.members"))"
                )
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Members

    private func membersSection(_ vm: HouseholdViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("household.membersTitle"))
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

    private func memberRow(
        _ member: HouseholdMember,
        viewModel vm: HouseholdViewModel
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                // Avatar
                avatarView(member)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text(member.displayName ?? localization.t("household.unknown"))
                            .font(.system(
                                size: DesignTokens.FontSize.base,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if vm.isOwner(member) {
                            GlassBadge(
                                text: localization.t("household.owner"),
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

    // MARK: - Avatar

    private func avatarView(_ member: HouseholdMember) -> some View {
        Group {
            if let avatarUrl = member.avatar, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    avatarPlaceholder(member)
                }
            } else {
                avatarPlaceholder(member)
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
    }

    private func avatarPlaceholder(_ member: HouseholdMember) -> some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .overlay(
                Text(String((member.displayName ?? "?").prefix(1)).uppercased())
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            )
    }

    // MARK: - Add Member

    private func addMemberSection(_ vm: HouseholdViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("household.addMember"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassTextField(
                    localization.t("household.userIdPlaceholder"),
                    text: Binding(
                        get: { vm.newMemberUserId },
                        set: { vm.newMemberUserId = $0 }
                    )
                )

                GlassButton(
                    localization.t("household.addButton"),
                    variant: .primary,
                    isLoading: vm.isAddingMember
                ) {
                    HapticFeedbackService.impact(style: .medium)
                    Task { await vm.addMember() }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
