import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad sidebar navigation replacing the bottom tab bar
struct IPadSidebarView: View {
    let isCollapsed: Bool
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        if isCollapsed {
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.xs) {
                    ForEach(AppTab.allCases) { tab in
                        iconButton(
                            coordinator.selectedTab == tab ? tab.selectedIconName : tab.iconName,
                            isSelected: coordinator.selectedTab == tab
                        ) {
                            coordinator.selectedTab = tab
                            coordinator.popToRoot()
                        }
                    }
                    Divider().padding(.horizontal, DesignTokens.Spacing.sm)
                    iconButton("radio") { coordinator.navigate(to: .radio) }
                    iconButton("book") { coordinator.navigate(to: .audiobooks) }
                    iconButton("figure.and.child.holdinghands") { coordinator.navigate(to: .children) }
                    iconButton("flame") { coordinator.navigate(to: .trending) }
                    Divider().padding(.horizontal, DesignTokens.Spacing.sm)
                    iconButton("person.circle") { coordinator.navigate(to: .profile) }
                    iconButton("heart") { coordinator.navigate(to: .favorites) }
                    iconButton("arrow.down.circle") { coordinator.navigate(to: .downloads) }
                    iconButton("gearshape") { coordinator.navigate(to: .settings) }
                }
                .padding(.vertical, DesignTokens.Spacing.md)
            }
            .background(DesignTokens.Background.primary)
        } else {
            List {
                mainTabsSection
                browseSection
                userSection
            }
            .listStyle(.sidebar)
            .scrollContentBackground(.hidden)
            .background(DesignTokens.Background.primary)
            .navigationTitle("Bayit+")
            .safeAreaInset(edge: .bottom) {
                languagePicker
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.bottom, DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Main Tabs

    private var mainTabsSection: some View {
        Section {
            ForEach(AppTab.allCases) { tab in
                sidebarButton(
                    icon: coordinator.selectedTab == tab
                        ? tab.selectedIconName : tab.iconName,
                    title: tab.hasLocalizationKey
                        ? localization.t(tab.localizationKey) : tab.title,
                    isSelected: coordinator.selectedTab == tab
                ) {
                    coordinator.selectedTab = tab
                    coordinator.popToRoot()
                }
            }
        } header: {
            Text(localization.t("nav.home"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Browse Section

    private var browseSection: some View {
        Section {
            sidebarButton(icon: "radio", title: "Radio", isSelected: false) {
                coordinator.navigate(to: .radio)
            }
            sidebarButton(icon: "book", title: localization.t("audiobooks.title"),
                          isSelected: false) {
                coordinator.navigate(to: .audiobooks)
            }
            sidebarButton(icon: "figure.and.child.holdinghands",
                          title: localization.t("settings.children"),
                          isSelected: false) {
                coordinator.navigate(to: .children)
            }
            sidebarButton(icon: "flame", title: localization.t("trending.title"),
                          isSelected: false) {
                coordinator.navigate(to: .trending)
            }
        } header: {
            Text("Browse")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - User Section

    private var userSection: some View {
        Section {
            sidebarButton(icon: "person.circle", title: localization.t("profile.title"),
                          isSelected: false) {
                coordinator.navigate(to: .profile)
            }
            sidebarButton(icon: "heart", title: localization.t("profile.favorites"),
                          isSelected: false) {
                coordinator.navigate(to: .favorites)
            }
            sidebarButton(icon: "arrow.down.circle",
                          title: localization.t("profile.downloads"),
                          isSelected: false) {
                coordinator.navigate(to: .downloads)
            }
            sidebarButton(icon: "gearshape", title: localization.t("settings.title"),
                          isSelected: false) {
                coordinator.navigate(to: .settings)
            }
        } header: {
            Text(localization.t("profile.title"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Language Picker

    private var languagePicker: some View {
        Button {
            coordinator.navigate(to: .languageSettings)
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "globe")
                    .font(.system(size: 16))
                Text(localization.currentLanguage.rawValue.uppercased())
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.xs))
            }
            .foregroundColor(DesignTokens.Text.secondary)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    // MARK: - Sidebar Button

    private func sidebarButton(icon: String, title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label {
                Text(title)
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: isSelected ? .semibold : .regular
                    ))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.primary
                    )
            } icon: {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary
                    )
                    .frame(width: 28)
            }
        }
        .listRowBackground(
            isSelected
                ? DesignTokens.Glass.bgMedium
                : Color.clear
        )
    }

    // MARK: - Icon Button (compact mode)

    private func iconButton(_ icon: String, isSelected: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                .frame(width: 44, height: 44)
                .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
        .buttonStyle(.plain)
    }
}
