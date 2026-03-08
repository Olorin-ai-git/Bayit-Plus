import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Expanded sidebar sections for the iPad sidebar list mode
struct IPadSidebarMainTabs: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Section {
            ForEach(AppTab.allCases) { tab in
                IPadSidebarButton(
                    icon: coordinator.selectedTab == tab ? tab.selectedIconName : tab.iconName,
                    title: tab.hasLocalizationKey ? localization.t(tab.localizationKey) : tab.title,
                    isSelected: coordinator.selectedTab == tab
                ) {
                    coordinator.selectedTab = tab
                    coordinator.popToRoot()
                }
            }
        } header: {
            sectionHeader(localization.t("nav.home"))
        }
    }
}

struct IPadSidebarBrowseSection: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Section {
            IPadSidebarButton(icon: "radio", title: "Radio", isSelected: false) {
                coordinator.navigate(to: .radio)
            }
            IPadSidebarButton(icon: "book", title: localization.t("audiobooks.title"), isSelected: false) {
                coordinator.navigate(to: .audiobooks)
            }
            IPadSidebarButton(icon: "figure.and.child.holdinghands", title: localization.t("settings.children"), isSelected: false) {
                coordinator.navigate(to: .children)
            }
            IPadSidebarButton(icon: "flame", title: localization.t("trending.title"), isSelected: false) {
                coordinator.navigate(to: .trending)
            }
        } header: {
            sectionHeader("Browse")
        }
    }
}

struct IPadSidebarSocialSection: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Section {
            IPadSidebarButton(icon: "person.2", title: localization.t("friends.title"), isSelected: false) {
                coordinator.navigate(to: .friends)
            }
            IPadSidebarButton(icon: "popcorn", title: localization.t("watchParty.title"), isSelected: false) {
                coordinator.navigate(to: .watchParty)
            }
            IPadSidebarButton(icon: "checkerboard.rectangle", title: localization.t("chess.title"), isSelected: false) {
                coordinator.navigate(to: .chess(gameId: nil))
            }
            IPadSidebarButton(icon: "bubble.left.and.bubble.right", title: localization.t("messages.title"), isSelected: false) {
                coordinator.navigate(to: .directMessages)
            }
        } header: {
            sectionHeader(localization.t("social.title"))
        }
    }
}

struct IPadSidebarContentSection: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Section {
            IPadSidebarButton(icon: "music.note.list", title: localization.t("common.playlist"), isSelected: false) {
                coordinator.navigate(to: .playlist)
            }
            IPadSidebarButton(icon: "record.circle", title: localization.t("recordings.title"), isSelected: false) {
                coordinator.navigate(to: .recordings)
            }
            IPadSidebarButton(icon: "square.grid.2x2", title: localization.t("widgets.title"), isSelected: false) {
                coordinator.navigate(to: .widgets)
            }
        } header: {
            sectionHeader(localization.t("nav.content"))
        }
    }
}

struct IPadSidebarUserSection: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Section {
            IPadSidebarButton(icon: "person.circle", title: localization.t("profile.title"), isSelected: false) {
                coordinator.navigate(to: .profile)
            }
            IPadSidebarButton(icon: "heart", title: localization.t("profile.favorites"), isSelected: false) {
                coordinator.navigate(to: .favorites)
            }
            IPadSidebarButton(icon: "arrow.down.circle", title: localization.t("profile.downloads"), isSelected: false) {
                coordinator.navigate(to: .downloads)
            }
            IPadSidebarButton(icon: "house", title: localization.t("household.title"), isSelected: false) {
                coordinator.navigate(to: .household)
            }
            IPadSidebarButton(icon: "trophy", title: localization.t("rewards.title"), isSelected: false) {
                coordinator.navigate(to: .rewards)
            }
            IPadSidebarButton(icon: "person.and.background.dotted", title: localization.t("familyControls.title"), isSelected: false) {
                coordinator.navigate(to: .familyControls)
            }
            IPadSidebarButton(icon: "star.circle", title: localization.t("beta.credits"), isSelected: false) {
                coordinator.navigate(to: .betaCredits)
            }
            IPadSidebarButton(icon: "questionmark.circle", title: localization.t("support.title"), isSelected: false) {
                coordinator.navigate(to: .support)
            }
            IPadSidebarButton(icon: "gearshape", title: localization.t("settings.title"), isSelected: false) {
                coordinator.navigate(to: .settings)
            }
        } header: {
            sectionHeader(localization.t("profile.title"))
        }
    }
}

/// Shared section header styling
func sectionHeader(_ title: String) -> some View {
    Text(title)
        .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
        .foregroundStyle(DesignTokens.Text.muted)
}
