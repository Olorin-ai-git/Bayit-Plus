import BayitDesignSystem
import SwiftUI

/// Displays a user avatar, name, and optional online status indicator.
/// Reusable across Friends list, Watch Party participants, and DM conversations.
struct UserAvatarRow: View {
    let name: String
    let avatarURL: String?
    let isOnline: Bool?

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            avatarView
            nameLabel

            Spacer()

            if let isOnline {
                OnlineStatusBadge(isOnline: isOnline)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
    }

    // MARK: - Subviews

    @ViewBuilder
    private var avatarView: some View {
        if let avatarURL, let url = URL(string: avatarURL) {
            AsyncImage(url: url) { image in
                image
                    .resizable()
                    .scaledToFill()
            } placeholder: {
                avatarPlaceholder
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 40, height: 40)
            .overlay(
                Text(String(name.prefix(1)).uppercased())
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
            )
    }

    private var nameLabel: some View {
        Text(name)
            .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
            .foregroundStyle(DesignTokens.Text.primary)
            .lineLimit(1)
    }

    private var accessibilityDescription: String {
        var parts = [name]
        if let isOnline {
            parts.append(isOnline ? "Online" : "Offline")
        }
        return parts.joined(separator: ", ")
    }
}
