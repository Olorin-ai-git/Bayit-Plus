import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Household management screen with member list and add/remove functionality.
/// Reuses HouseholdViewModel from shared ViewModels.
struct TVHouseholdView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: HouseholdViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.household == nil {
                    loadingState
                } else if let error = vm.error, vm.household == nil {
                    tvErrorState(error) {
                        Task { await vm.load() }
                    }
                } else {
                    contentSections(vm)
                }
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

    private func contentSections(_ vm: HouseholdViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            householdHeader(vm)
            membersSection(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func householdHeader(_ vm: HouseholdViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "house.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(vm.household?.name ?? "My Household")
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("\(vm.memberCount) / \(vm.maxProfiles) Members")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func membersSection(_ vm: HouseholdViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("household.members"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)

            if let members = vm.household?.members {
                LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(members, id: \.stableId) { member in
                        memberRow(member, viewModel: vm)
                    }
                }
            }
        }
    }

    private func memberRow(_ member: HouseholdMember, viewModel vm: HouseholdViewModel) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                avatarView(member)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Text(member.displayName ?? "Unknown")
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if vm.isOwner(member) {
                            Text(localization.t("household.owner"))
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                                .foregroundStyle(DesignTokens.Primary.default)
                                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                                .padding(.vertical, TVDesignTokens.Spacing.xxs)
                                .background(DesignTokens.Glass.bgMedium)
                                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                        }
                    }

                    if let role = member.role {
                        Text(role)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private func avatarView(_ member: HouseholdMember) -> some View {
        Group {
            if let avatarUrl = member.avatar, let url = URL(string: avatarUrl) {
                CachedAsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    avatarPlaceholder(member)
                }
            } else {
                avatarPlaceholder(member)
            }
        }
        .frame(width: 80, height: 80)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
    }

    private func avatarPlaceholder(_ member: HouseholdMember) -> some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .overlay(
                Text(String((member.displayName ?? "?").prefix(1)).uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            )
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("household.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
