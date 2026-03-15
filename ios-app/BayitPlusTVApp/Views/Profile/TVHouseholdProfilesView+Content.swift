import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Household Content + Slots

extension TVHouseholdProfilesView {
    func householdContentView(_ household: Household) -> some View {
        let members = household.members ?? []
        let emptyCount = max(0, maxSlots - members.count)

        return VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            // Centered title
            Text(localization.t("profile.householdProfiles"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            // Subtitle: "Family — X of 5 profiles"
            Text("\(household.name ?? localization.t("profile.household")) \u{2014} "
                + localization.t("household.memberCount",
                                 ["count": "\(members.count)"])
                + " / \(household.maxProfiles ?? maxSlots)")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            // Profile slots row
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(members) { member in
                    memberSlot(member, isOwner: member.userId == household.ownerId)
                }
                ForEach(0 ..< emptyCount, id: \.self) { _ in
                    emptySlot
                }
            }
            .padding(.horizontal, 60)
            .padding(.vertical, TVDesignTokens.Spacing.lg)

            // Add Profile button
            if members.count < (household.maxProfiles ?? maxSlots) {
                addProfileButton
                    .padding(.horizontal, 120)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func memberSlot(_ member: HouseholdMember, isOwner: Bool) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
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
            .overlay(
                Circle().strokeBorder(
                    isOwner
                        ? DesignTokens.Warning.default
                        : Color.white.opacity(0.15),
                    lineWidth: isOwner ? 3 : 1
                )
            )

            // Owner badge
            if isOwner {
                ownerBadge
            }

            Text(member.displayName ?? localization.t("profile.unknown"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
        }
        .frame(width: 160)
        .padding(TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    isOwner
                        ? DesignTokens.Warning.default.opacity(0.6)
                        : Color.white.opacity(0.08),
                    lineWidth: isOwner ? 2 : 1
                )
        )
    }

    private var ownerBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.system(size: 10, weight: .bold))
            Text(localization.t("household.owner").uppercased())
                .font(.system(size: 11, weight: .bold))
        }
        .foregroundStyle(DesignTokens.Warning.default)
        .padding(.horizontal, TVDesignTokens.Spacing.sm)
        .padding(.vertical, 4)
        .background(DesignTokens.Warning.default.opacity(0.15))
        .clipShape(Capsule())
    }

    private var emptySlot: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            ZStack {
                Circle()
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                    )
                    .foregroundStyle(DesignTokens.Text.muted.opacity(0.4))

                Image(systemName: "plus")
                    .font(.system(size: 32, weight: .light))
                    .foregroundStyle(DesignTokens.Text.muted.opacity(0.5))
            }
            .frame(width: 120, height: 120)

            // Spacer to align with member slot height
            Color.clear.frame(height: TVDesignTokens.FontSize.sm + 4)
        }
        .frame(width: 160)
        .padding(TVDesignTokens.Spacing.md)
        .background(Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    style: StrokeStyle(lineWidth: 1.5, dash: [10, 8])
                )
                .foregroundStyle(DesignTokens.Text.muted.opacity(0.3))
        )
    }

    private var addProfileButton: some View {
        Button {
            showingInvite = true
        } label: {
            Text(localization.t("profile.addProfile"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .background(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p500, DesignTokens.Primary.p700],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .tvCardStyle()
    }

    // MARK: - No Household

    var noHouseholdView: some View {
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
                    .background(DesignTokens.Primary.p400)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Invite Sheet

    var inviteSheet: some View {
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
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                .focused($inviteFieldFocused)
                .frame(maxWidth: 500)
                .keyboardType(.emailAddress)

            inviteButtons
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .onExitCommand { showingInvite = false }
        .task { inviteFieldFocused = true }
    }

    private var inviteButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            Button {
                showingInvite = false
                inviteEmail = ""
            } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 220, height: 70)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()

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
                .background(inviteEmail.contains("@")
                    ? DesignTokens.Primary.p400
                    : DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
            .disabled(!inviteEmail.contains("@") || isInviting)
        }
    }
}
