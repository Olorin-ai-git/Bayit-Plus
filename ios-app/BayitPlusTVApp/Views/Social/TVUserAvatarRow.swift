import BayitDesignSystem
import SwiftUI

/// Displays a user avatar, name, and optional online status for tvOS.
/// Scaled up from iOS (80x80 avatar, larger fonts) for 10-foot UI.
struct TVUserAvatarRow: View {
    let name: String
    let avatarURL: String?
    let isOnline: Bool?

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            avatarView
            nameLabel

            Spacer()

            if let isOnline {
                TVOnlineStatusBadge(isOnline: isOnline)
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
            .frame(width: 80, height: 80)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 80, height: 80)
            .overlay(
                Text(String(name.prefix(1)).uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
            )
    }

    private var nameLabel: some View {
        Text(name)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
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
