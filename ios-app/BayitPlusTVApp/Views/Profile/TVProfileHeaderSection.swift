import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Profile header with avatar, name, contact info, and badges.
struct TVProfileHeaderSection: View {
    let profile: ProfileResponse
    let localization: LocalizationManager
    let onEditProfile: () -> Void
    let onEditAvatar: () -> Void

    var body: some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                ZStack(alignment: .bottomTrailing) {
                    profileAvatar

                    Button {
                        onEditAvatar()
                    } label: {
                        Image(systemName: "pencil.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .background(
                                Circle()
                                    .fill(DesignTokens.Background.primary)
                                    .frame(width: 28, height: 28)
                            )
                    }
                    .buttonStyle(.plain)
                    .offset(x: 8, y: 8)
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack {
                        Text(profile.displayName ?? localization.t("common.guest"))
                            .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Button {
                            onEditProfile()
                        } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                        .buttonStyle(.plain)
                    }

                    if let email = profile.email {
                        contactRow(
                            icon: "envelope.fill",
                            text: email,
                            isVerified: profile.emailVerified == true
                        )
                    }

                    if let phoneNumber = profile.phoneNumber {
                        contactRow(
                            icon: "phone.fill",
                            text: phoneNumber,
                            isVerified: profile.phoneVerified == true
                        )
                    }

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        memberSinceBadge(profile.createdAt)

                        if let provider = profile.authProvider {
                            providerBadge(provider)
                        }
                    }
                }

                Spacer()
            }
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    private func contactRow(icon: String, text: String, isVerified: Bool) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.sm))
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.md))

            if isVerified {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Success.default)
            }
        }
        .foregroundStyle(DesignTokens.Text.secondary)
    }

    private var profileAvatar: some View {
        Group {
            if let avatarURL = profile.avatar, let url = URL(string: avatarURL) {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        avatarFallback
                    }
                }
            } else {
                avatarFallback
            }
        }
        .frame(width: 140, height: 140)
        .clipShape(Circle())
        .overlay(
            Circle()
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400,
                            DesignTokens.Secondary.s400,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 4
                )
        )
        .shadow(color: DesignTokens.Glass.purpleGlow.opacity(0.4), radius: 16, x: 0, y: 8)
    }

    private var avatarFallback: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400,
                            DesignTokens.Secondary.s400,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text(String((profile.displayName ?? "?").prefix(1)).uppercased())
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private func memberSinceBadge(_ createdAt: String?) -> some View {
        Group {
            if let created = createdAt, let date = ISO8601DateFormatter().date(from: created) {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "calendar")
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                    Text(localization.t("profile.memberSince", ["date": date.formatted(.dateTime.year().month())]))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.sm)
                .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private func providerBadge(_ provider: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: providerIcon(provider))
                .font(.system(size: TVDesignTokens.FontSize.xs))
            Text(provider.capitalized)
                .font(.system(size: TVDesignTokens.FontSize.sm))
        }
        .padding(.horizontal, TVDesignTokens.Spacing.sm)
        .padding(.vertical, TVDesignTokens.Spacing.xs)
        .background(DesignTokens.Glass.bgLight)
        .cornerRadius(TVDesignTokens.Radius.sm)
        .foregroundStyle(DesignTokens.Info.default)
    }

    private func providerIcon(_ provider: String) -> String {
        switch provider.lowercased() {
        case "google": return "g.circle.fill"
        case "apple": return "apple.logo"
        case "facebook": return "f.circle.fill"
        default: return "person.circle.fill"
        }
    }
}
