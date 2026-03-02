import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS profile selection -- "Who's watching?"
/// Large profile cards with focus states for remote navigation.
struct TVProfileSelectionView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    let onProfileSelected: () -> Void

    private let avatarColors: [Color] = [
        DesignTokens.Primary.p500,
        DesignTokens.ErrorColor.e400,
        DesignTokens.Success.s400,
        DesignTokens.Warning.w400,
        DesignTokens.Secondary.s500,
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            Spacer()

            Text("Bayit+")
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            DesignTokens.Colors.Primary.light,
                            DesignTokens.Colors.Primary.base,
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text(localization.t("profiles.whosWatching"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            profilesRow

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .task {
            try? await authManager.loadProfiles()
        }
    }

    private var profilesRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(authManager.profiles) { profile in
                TVProfileCard(
                    profile: profile,
                    color: avatarColor(for: profile)
                ) {
                    Task {
                        try? await authManager.selectProfile(profile)
                        onProfileSelected()
                    }
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    private func avatarColor(for profile: UserProfile) -> Color {
        let index = abs(profile.name.hashValue) % avatarColors.count
        return avatarColors[index]
    }
}

// MARK: - TV Profile Card

private struct TVProfileCard: View {
    let profile: UserProfile
    let color: Color
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ZStack {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .fill(color)
                        .frame(width: 180, height: 180)

                    Text(initials)
                        .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if profile.isChild {
                        kidsIndicator
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(
                            isFocused
                                ? DesignTokens.Glass.borderFocus
                                : Color.clear,
                            lineWidth: TVDesignTokens.Focus.ringWidth
                        )
                )

                Text(profile.name)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(
                        isFocused
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )
                    .frame(maxWidth: 180)
                    .lineLimit(1)
            }
        }
        .buttonStyle(TVProfileButtonStyle())
        .focusEffectDisabled()
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
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(.black)
            .padding(TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Warning.default)
            .clipShape(Circle())
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            .offset(x: 8, y: 8)
    }
}

private struct TVProfileButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .focusEffectDisabled()
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .shadow(
                color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0, y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.3),
                value: isFocused
            )
    }
}
