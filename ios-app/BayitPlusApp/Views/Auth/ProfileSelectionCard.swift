import BayitAuth
import BayitDesignSystem
import SwiftUI

// MARK: - Avatar Colors

let profileAvatarColors: [Color] = [
    DesignTokens.Primary.p500,
    DesignTokens.ErrorColor.e400,
    DesignTokens.Success.s400,
    DesignTokens.Warning.w400,
    DesignTokens.Secondary.s500,
    DesignTokens.Success.s400.opacity(0.6),
    DesignTokens.ErrorColor.e400.opacity(0.6),
    DesignTokens.Warning.w400.opacity(0.6),
]

/// Card representing a single user profile in the selection grid.
struct ProfileSelectionCard: View {
    let profile: UserProfile
    let isManageMode: Bool
    let onSelect: () -> Void

    private var avatarColor: Color {
        let index = abs(profile.name.hashValue) % profileAvatarColors.count
        return profileAvatarColors[index]
    }

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                avatarView
                nameLabel
            }
        }
    }

    // MARK: - Avatar

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

    // MARK: - Name

    private var nameLabel: some View {
        Text(profile.name)
            .font(.system(size: 14))
            .foregroundStyle(DesignTokens.Colors.Text.muted)
            .frame(maxWidth: 120)
            .lineLimit(1)
    }

    // MARK: - Helpers

    private var initials: String {
        profile.name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    // MARK: - Indicators

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
