import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - My Content Section

struct TVProfileMyContentSection: View {
    let localization: LocalizationManager
    let onAction: (TVProfileDestination) -> Void

    var body: some View {
        Section {
            profileActionRow(icon: "heart.fill", title: localization.t("profile.myFavorites"),
                             subtitle: localization.t("profile.viewFavoriteContent"),
                             color: DesignTokens.ErrorColor.e400) { onAction(.favorites) }

            profileActionRow(icon: "record.circle", title: localization.t("profile.myRecordings"),
                             subtitle: localization.t("profile.manageDvrRecordings"),
                             color: DesignTokens.Warning.default) { onAction(.recordings) }

            profileActionRow(icon: "list.bullet", title: localization.t("profile.myPlaylists"),
                             subtitle: localization.t("profile.organizeContent"),
                             color: DesignTokens.Secondary.s400) { onAction(.playlists) }

            profileActionRow(icon: "clock.arrow.circlepath", title: localization.t("profile.viewingHistory"),
                             subtitle: localization.t("profile.seeWhatYouWatched"),
                             color: DesignTokens.Info.default) { onAction(.history) }

            profileActionRow(icon: "square.grid.2x2", title: localization.t("nav.widgets"),
                             subtitle: localization.t("profile.widgetsDesc"),
                             color: DesignTokens.Secondary.s400) { onAction(.widgets) }
        } header: {
            profileSectionHeader(localization.t("profile.myContent"))
        }
    }
}

// MARK: - Social Section

struct TVProfileSocialSection: View {
    let localization: LocalizationManager
    let onAction: (TVProfileDestination) -> Void

    var body: some View {
        Section {
            profileActionRow(icon: "person.2.fill", title: localization.t("nav.friends"),
                             subtitle: localization.t("profile.friendsDesc"),
                             color: DesignTokens.Primary.p400) { onAction(.friends) }

            profileActionRow(icon: "bubble.left.and.bubble.right", title: localization.t("profile.messages"),
                             subtitle: localization.t("profile.messagesDesc"),
                             color: DesignTokens.Info.default) { onAction(.messages) }
        } header: {
            profileSectionHeader(localization.t("profile.social"))
        }
    }
}

// MARK: - Shared Helpers

func profileSectionHeader(_ title: String) -> some View {
    Text(title)
        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
        .foregroundStyle(DesignTokens.Text.primary)
        .textCase(nil)
}

func profileActionRow(
    icon: String,
    title: String,
    subtitle: String,
    color: Color,
    action: @escaping () -> Void
) -> some View {
    Button(action: action) {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundStyle(color)
                .frame(width: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
