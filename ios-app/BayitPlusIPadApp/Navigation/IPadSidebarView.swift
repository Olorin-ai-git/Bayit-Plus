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
            collapsedSidebar
        } else {
            expandedSidebar
        }
    }

    // MARK: - Collapsed (icon-only)

    private var collapsedSidebar: some View {
        ScrollView {
            LazyVStack(spacing: DesignTokens.Spacing.xs) {
                ForEach(AppTab.allCases) { tab in
                    IPadSidebarIconButton(
                        coordinator.selectedTab == tab ? tab.selectedIconName : tab.iconName,
                        isSelected: coordinator.selectedTab == tab
                    ) {
                        coordinator.selectedTab = tab
                        coordinator.popToRoot()
                    }
                }
                collapsedDivider
                IPadSidebarIconButton("radio") { coordinator.navigate(to: .radio) }
                IPadSidebarIconButton("book") { coordinator.navigate(to: .audiobooks) }
                IPadSidebarIconButton("figure.and.child.holdinghands") { coordinator.navigate(to: .children) }
                IPadSidebarIconButton("flame") { coordinator.navigate(to: .trending) }
                collapsedDivider
                IPadSidebarIconButton("person.2") { coordinator.navigate(to: .friends) }
                IPadSidebarIconButton("popcorn") { coordinator.navigate(to: .watchParty) }
                IPadSidebarIconButton("bubble.left.and.bubble.right") { coordinator.navigate(to: .directMessages) }
                collapsedDivider
                IPadSidebarIconButton("music.note.list") { coordinator.navigate(to: .playlist) }
                IPadSidebarIconButton("record.circle") { coordinator.navigate(to: .recordings) }
                IPadSidebarIconButton("square.grid.2x2") { coordinator.navigate(to: .widgets) }
                collapsedDivider
                IPadSidebarIconButton("person.circle") { coordinator.navigate(to: .profile) }
                IPadSidebarIconButton("heart") { coordinator.navigate(to: .favorites) }
                IPadSidebarIconButton("arrow.down.circle") { coordinator.navigate(to: .downloads) }
                IPadSidebarIconButton("gearshape") { coordinator.navigate(to: .settings) }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Expanded (full sidebar)

    private var expandedSidebar: some View {
        List {
            IPadSidebarMainTabs()
            IPadSidebarBrowseSection()
            IPadSidebarSocialSection()
            IPadSidebarContentSection()
            IPadSidebarUserSection()
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

    private var collapsedDivider: some View {
        Divider().padding(.horizontal, DesignTokens.Spacing.sm)
    }
}
