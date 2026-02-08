import BayitAuth
import BayitDesignSystem
import SwiftUI

// MARK: - Avatar Colors

private let avatarColors: [Color] = [
    DesignTokens.Primary.p500,
    DesignTokens.ErrorColor.e400,
    DesignTokens.Success.s400,
    DesignTokens.Warning.w400,
    DesignTokens.Secondary.s500,
    DesignTokens.Success.s400.opacity(0.6),
    DesignTokens.ErrorColor.e400.opacity(0.6),
    DesignTokens.Warning.w400.opacity(0.6),
]

/// Profile selection screen matching web app design - "Who's watching?"
struct ProfileSelectionView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var isManageMode = false

    let onProfileSelected: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            AuthComponents.LogoSection()

            titleText

            profilesGrid

            manageButton

            Spacer()
        }
    }

    // MARK: - Title

    private var titleText: some View {
        Text(isManageMode ? "Manage Profiles" : "Who's watching?")
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(.white)
    }

    // MARK: - Profiles Grid

    private var profilesGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: DesignTokens.Spacing.lg),
                GridItem(.flexible(), spacing: DesignTokens.Spacing.lg),
            ],
            spacing: DesignTokens.Spacing.lg
        ) {
            ForEach(authManager.profiles) { profile in
                ProfileCardView(
                    profile: profile,
                    isManageMode: isManageMode,
                    onSelect: { handleProfileSelect(profile) }
                )
            }

            if authManager.profiles.count < 5, !isManageMode {
                addProfileCard
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xxxl)
    }

    // MARK: - Add Profile

    private var addProfileCard: some View {
        Button {} label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                ZStack {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(
                            Color.white.opacity(0.15),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .frame(width: 120, height: 120)
                        .background(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                                .fill(Color.white.opacity(0.03))
                        )

                    Image(systemName: "plus")
                        .font(.system(size: 36))
                        .foregroundStyle(DesignTokens.Colors.Text.muted)
                }

                Text("Add Profile")
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
            }
        }
    }

    // MARK: - Manage Button

    private var manageButton: some View {
        Button { isManageMode.toggle() } label: {
            Text(isManageMode ? "Done" : "Manage Profiles")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        }
    }

    // MARK: - Actions

    private func handleProfileSelect(_ profile: UserProfile) {
        guard !isManageMode else { return }
        Task {
            try? await authManager.selectProfile(profile)
            onProfileSelected()
        }
    }
}

// MARK: - Profile Card

private struct ProfileCardView: View {
    let profile: UserProfile
    let isManageMode: Bool
    let onSelect: () -> Void

    private var avatarColor: Color {
        let index = abs(profile.name.hashValue) % avatarColors.count
        return avatarColors[index]
    }

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                avatarView
                nameLabel
            }
        }
    }

    private var avatarView: some View {
        ZStack {
            avatarBackground
            avatarInitials
            badges
        }
    }

    private var avatarBackground: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(avatarColor)
            .frame(width: 120, height: 120)
    }

    private var avatarInitials: some View {
        Text(initials)
            .font(.system(size: 40, weight: .bold))
            .foregroundStyle(.white)
    }

    @ViewBuilder
    private var badges: some View {
        if isManageMode {
            editOverlay
        }
        if profile.isChild {
            kidsIndicator
        }
        if profile.hasPin {
            pinIndicator
        }
    }

    private var nameLabel: some View {
        Text(profile.name)
            .font(.system(size: 14))
            .foregroundStyle(DesignTokens.Colors.Text.muted)
            .frame(maxWidth: 120)
            .lineLimit(1)
    }

    private var initials: String {
        profile.name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    private var kidsIndicator: some View {
        Image(systemName: "figure.child")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.black)
            .padding(6)
            .background(DesignTokens.Warning.default)
            .clipShape(Circle())
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            .offset(x: 4, y: 4)
    }

    private var pinIndicator: some View {
        Image(systemName: "lock.fill")
            .font(.system(size: 10))
            .foregroundStyle(DesignTokens.Colors.Text.muted)
            .padding(6)
            .background(DesignTokens.Colors.Background.elevated)
            .clipShape(Circle())
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
            .offset(x: 4, y: -4)
    }

    private var editOverlay: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(Color.black.opacity(0.5))
            .frame(width: 120, height: 120)
            .overlay(
                Image(systemName: "pencil")
                    .font(.system(size: 24))
                    .foregroundStyle(.white)
            )
    }
}
