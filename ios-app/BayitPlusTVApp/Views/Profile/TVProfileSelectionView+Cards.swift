import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Circular avatar card for a household member in the profile selection grid.
struct TVProfileCard: View {
    let member: HouseholdMember
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    private let avatarSize: CGFloat = 180
    private let cardWidth: CGFloat = 220

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                avatarCircle
                nameLabel
            }
            .frame(width: cardWidth)
        }
        .tvCardStyle()
    }

    // MARK: - Avatar

    private var avatarCircle: some View {
        ZStack {
            if let avatarURL = member.avatar,
               let url = URL(string: avatarURL)
            {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        gradientPlaceholder
                    }
                }
            } else {
                gradientPlaceholder
            }
        }
        .frame(width: avatarSize, height: avatarSize)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(DesignTokens.Glass.border, lineWidth: 2)
        )
    }

    private var gradientPlaceholder: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: gradientColors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text(initials)
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    // MARK: - Name

    private var nameLabel: some View {
        Text(member.displayName ?? member.stableId)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .lineLimit(1)
    }

    // MARK: - Helpers

    private var initials: String {
        guard let name = member.displayName, !name.isEmpty else {
            return "?"
        }
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    private var gradientColors: [Color] {
        let hash = abs(member.stableId.hashValue)
        let palettes: [[Color]] = [
            [.purple, .pink],
            [.blue, .cyan],
            [.green, .teal],
            [.orange, .red],
            [.indigo, .purple],
            [.yellow, .orange],
        ]
        return palettes[hash % palettes.count]
    }
}

/// "Add Profile" card shown at the end of the profile selection grid.
struct TVAddProfileCard: View {
    @Environment(LocalizationManager.self) private var localization

    let onTap: () -> Void

    private let avatarSize: CGFloat = 180
    private let cardWidth: CGFloat = 220

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(width: avatarSize, height: avatarSize)
                    Circle()
                        .stroke(
                            DesignTokens.Glass.border,
                            style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                        )
                        .frame(width: avatarSize, height: avatarSize)
                    Image(systemName: "plus")
                        .font(.system(size: TVDesignTokens.FontSize.display, weight: .light))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Text(localization.t("profile.addProfile"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(width: cardWidth)
        }
        .tvCardStyle()
    }
}
