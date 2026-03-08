import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Household profiles management screen for tvOS.
struct TVHouseholdProfilesView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let onDismiss: () -> Void

    @State private var household: Household?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showingInvite = false
    @State private var inviteEmail = ""
    @State private var isInviting = false
    @FocusState private var inviteFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            TVProfileSheetHeader(
                title: localization.t("profile.householdProfiles"),
                onDismiss: onDismiss
            )

            Group {
                if isLoading {
                    loadingView
                } else if let error {
                    errorView(error)
                } else if let household {
                    householdContentView(household)
                } else {
                    noHouseholdView
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .task { await loadHousehold() }
        .fullScreenCover(isPresented: $showingInvite) {
            inviteSheet
        }
    }

    private var inviteSheet: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Image(systemName: "person.badge.plus")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("profile.addProfile"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("profile.addProfileSubtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField(localization.t("account.email"), text: $inviteEmail)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .focused($inviteFieldFocused)
                .frame(maxWidth: 500)
                .keyboardType(.emailAddress)

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    showingInvite = false
                    inviteEmail = ""
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.md)

                Button {
                    Task { await inviteMember() }
                } label: {
                    Group {
                        if isInviting {
                            ProgressView().tint(.white)
                        } else {
                            Text(localization.t("common.send"))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(inviteEmail.contains("@")
                    ? DesignTokens.Primary.p400
                    : DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .disabled(!inviteEmail.contains("@") || isInviting)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .onExitCommand { showingInvite = false }
        .task { inviteFieldFocused = true }
    }

    private func inviteMember() async {
        guard let householdId = household?.householdId else { return }
        isInviting = true
        do {
            try await repos.household.inviteMember(
                householdId: householdId,
                email: inviteEmail,
                role: "member"
            )
            showingInvite = false
            inviteEmail = ""
            await loadHousehold()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isInviting = false
    }

    private func householdContentView(_ household: Household) -> some View {
        ScrollView {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                HStack {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(household.name ?? localization.t("profile.household"))
                            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("household.memberCount",
                                            ["count": "\(household.members?.count ?? 0)"])
                                + " / \(household.maxProfiles ?? 5)")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Spacer()

                    if let members = household.members,
                       members.count < (household.maxProfiles ?? 5)
                    {
                        Button {
                            showingInvite = true
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "plus")
                                Text(localization.t("profile.addProfile"))
                            }
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Primary.p400)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

                if let members = household.members {
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                        ],
                        spacing: TVDesignTokens.Spacing.focusGap
                    ) {
                        ForEach(members) { member in
                            memberCard(member, isOwner: member.userId == household.ownerId)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func memberCard(_ member: HouseholdMember, isOwner: Bool) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ))

                if let first = member.displayName?.first {
                    Text(String(first).uppercased())
                        .font(.system(size: 48, weight: .bold))
                        .foregroundStyle(.white)
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 120, height: 120)

            Text(member.displayName ?? localization.t("profile.unknown"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            Text(isOwner
                ? localization.t("household.owner")
                : (member.role ?? localization.t("household.members")).capitalized)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(isOwner ? DesignTokens.Warning.default : DesignTokens.Text.secondary)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private var noHouseholdView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "person.2.fill")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("profile.householdProfiles"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("profile.householdProfilesDesc"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Button {
                Task { await createHousehold() }
            } label: {
                Text(localization.t("household.createHousehold"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 300, height: 70)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Primary.p400)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(2.0)
            Text(localization.t("profile.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Button { Task { await loadHousehold() } } label: {
                Text(localization.t("common.retry"))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func loadHousehold() async {
        isLoading = true
        error = nil
        do {
            household = try await repos.household.fetchHousehold()
        } catch {
            if let apiError = error as? APIError, case .notFound = apiError {
                household = nil
            } else if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }

    private func createHousehold() async {
        isLoading = true
        do {
            household = try await repos.household.createHousehold(
                name: localization.t("profile.household")
            )
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }
}
