import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad settings screen with a fixed-width sidebar category list and a detail
/// pane showing the selected category's existing settings view.
///
/// Uses a plain `HStack` split rather than `NavigationSplitView` so the settings
/// sub-views (which already manage their own scroll and padding) render cleanly
/// without an additional navigation chrome layer.
struct IPadSettingsView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(AuthManager.self) private var authManager

    @State private var selectedCategory: SettingsCategory = .general

    var body: some View {
        HStack(spacing: 0) {
            categorySidebar
                .frame(width: 280)
                .background(DesignTokens.Glass.bg)

            Divider()
                .background(DesignTokens.Glass.border)

            ScrollView(.vertical, showsIndicators: false) {
                selectedCategoryView
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Background.primary)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Sidebar

    private var categorySidebar: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("settings.title"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.top, DesignTokens.Spacing.lg)
                    .padding(.bottom, DesignTokens.Spacing.md)

                ForEach(SettingsCategory.allCases) { category in
                    categoryRow(category)
                }
            }
        }
    }

    private func categoryRow(_ category: SettingsCategory) -> some View {
        let isSelected = selectedCategory == category
        return Button {
            selectedCategory = category
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: category.icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary
                    )
                    .frame(width: 28)
                Text(category.title(localization: localization))
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: isSelected ? .semibold : .regular
                    ))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.primary
                    )
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
            .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
        }
    }

    // MARK: - Category Content

    @ViewBuilder
    private var selectedCategoryView: some View {
        switch selectedCategory {
        case .general:
            SettingsView()
        case .language:
            LanguageSettingsView()
        case .playback:
            PlaybackSettingsView()
        case .audio:
            AudioSettingsView()
        case .notifications:
            NotificationSettingsView()
        case .security:
            SecurityView()
        case .privacy:
            PrivacySettingsView()
        case .accessibility:
            AccessibilitySettingsView()
        case .billing:
            BillingView()
        case .connected:
            ConnectedAccountsView()
        }
    }
}

// MARK: - Settings Category

private enum SettingsCategory: String, CaseIterable, Identifiable {
    case general, language, playback, audio, notifications
    case security, privacy, accessibility, billing, connected

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .general:       return "gearshape"
        case .language:      return "globe"
        case .playback:      return "play.circle"
        case .audio:         return "speaker.wave.2"
        case .notifications: return "bell"
        case .security:      return "lock.shield"
        case .privacy:       return "hand.raised"
        case .accessibility: return "accessibility"
        case .billing:       return "creditcard"
        case .connected:     return "link"
        }
    }

    func title(localization: LocalizationManager) -> String {
        switch self {
        case .general:       return localization.t("settings.general")
        case .language:      return localization.t("settings.language")
        case .playback:      return localization.t("settings.playback")
        case .audio:         return localization.t("settings.audio")
        case .notifications: return localization.t("settings.notifications")
        case .security:      return localization.t("settings.security")
        case .privacy:       return localization.t("settings.privacy")
        case .accessibility: return localization.t("settings.accessibility")
        case .billing:       return localization.t("settings.billing")
        case .connected:     return localization.t("settings.connectedAccounts")
        }
    }
}
