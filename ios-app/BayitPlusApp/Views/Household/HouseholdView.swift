import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Household management screen with member list, add/remove functionality,
/// and owner badge indicators. Shows a create flow when no household exists.
///
/// Member list and avatar views are in `HouseholdMemberList.swift`.
/// Invite section and create household flow are in `HouseholdInviteSection.swift`.
struct HouseholdView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: HouseholdViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.household == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if vm.noHousehold {
                        createHouseholdSection(vm)
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

                Text(vm.household?.name ?? localization.t("household.title"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(
                    "\(vm.memberCount) \(localization.t("household.members"))"
                )
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
