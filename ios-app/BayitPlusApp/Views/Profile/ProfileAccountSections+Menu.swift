import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on ProfileView providing the menu section and sign-out button.
/// Extracted from ProfileAccountSections.swift to stay under 200 lines.
extension ProfileView {
    var menuSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            menuRow(icon: "globe", title: "profile.language") {
                coordinator.pushToCurrentTab(.languageSettings)
            }
            menuRow(icon: "square.grid.2x2", title: "profile.widgets") {
                coordinator.pushToCurrentTab(.widgets)
            }
            menuRow(icon: "person.fill.viewfinder", title: "profile.zehAni") {
                coordinator.pushToCurrentTab(.zehAni)
            }
            menuRow(icon: "heart.fill", title: "profile.favorites") {
                coordinator.pushToCurrentTab(.favorites)
            }
            menuRow(icon: "list.bullet", title: "profile.playlist") {
                coordinator.pushToCurrentTab(.playlist)
            }
            menuRow(icon: "arrow.down.circle.fill", title: "profile.downloads") {
                coordinator.pushToCurrentTab(.downloads)
            }
            menuRow(icon: "record.circle", title: "profile.recordings") {
                coordinator.pushToCurrentTab(.recordings)
            }
            menuRow(icon: "house.lodge.fill", title: "profile.household") {
                coordinator.pushToCurrentTab(.household)
            }
            menuRow(icon: "gearshape.fill", title: "profile.settings") {
                coordinator.pushToCurrentTab(.settings)
            }
            GlassCard {
                Button {
                    Task { await authManager.signOut() }
                } label: {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                            .frame(width: 32)
                        Text(localization.t("profile.logout"))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                        Spacer()
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func menuRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        GlassCard {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Primary.default)
                        .frame(width: 32)

                    Text(localization.t(title))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}
