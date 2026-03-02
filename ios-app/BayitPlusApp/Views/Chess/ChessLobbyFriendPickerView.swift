import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Horizontal scrollable picker showing friends available to challenge in chess.
struct ChessLobbyFriendPickerView: View {
    let friends: [Friend]
    let isLoading: Bool
    let onChallenge: (String) -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader
            content
        }
    }

    // MARK: - Header

    private var sectionHeader: some View {
        Text(localization.t("chess.challengeFriend"))
            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
            .foregroundStyle(DesignTokens.Text.secondary)
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if isLoading {
            loadingState
        } else if friends.isEmpty {
            emptyState
        } else {
            friendsList
        }
    }

    private var loadingState: some View {
        HStack {
            Spacer()
            ProgressView()
                .tint(DesignTokens.Text.muted)
            Spacer()
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var emptyState: some View {
        Text(localization.t("chess.noFriendsYet"))
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var friendsList: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(friends) { friend in
                    friendCard(friend)
                }
            }
        }
    }

    // MARK: - Friend Card

    private func friendCard(_ friend: Friend) -> some View {
        GlassCard(padding: DesignTokens.Spacing.sm) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                friendAvatar(friend)
                Text(friend.name)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                GlassButton(
                    localization.t("chess.challenge"),
                    variant: .primary,
                    size: .small
                ) {
                    onChallenge(friend.id)
                }
            }
            .frame(width: 110)
        }
        .accessibilityLabel(friend.name)
    }

    private func friendAvatar(_ friend: Friend) -> some View {
        Group {
            if let avatarURL = friend.avatar, let url = URL(string: avatarURL) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    initialsCircle(friend.name)
                }
            } else {
                initialsCircle(friend.name)
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(Circle())
    }

    private func initialsCircle(_ name: String) -> some View {
        ZStack {
            Circle().fill(DesignTokens.Glass.bgMedium)
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }
}
