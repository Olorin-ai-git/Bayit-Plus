import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Top navigation bar with logout, language selector, widgets, and search
struct TopNavigationBar: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Logout button
            Button {
                Task {
                    try? await authManager.signOut()
                }
            } label: {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 16))

                    Text("Logout")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                }
                .foregroundColor(DesignTokens.ErrorColor.default)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }

            Spacer()

            // Language selector button (flag)
            Button {
                coordinator.navigate(to: .languageSettings)
            } label: {
                Text("🇺🇸")  // TODO: Dynamic based on current language
                    .font(.system(size: 24))
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }

            // Widgets menu button
            Button {
                coordinator.selectedTab = .widgets
            } label: {
                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }

            // Search button
            Button {
                coordinator.presentFullscreen(.search)
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(
            DesignTokens.Glass.bg
                .overlay(
                    Rectangle()
                        .fill(.ultraThinMaterial)
                        .environment(\.colorScheme, .dark)
                )
        )
    }
}
