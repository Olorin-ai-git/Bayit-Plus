import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Fixed top navigation bar with brand name, language, playlist, and profile avatar.
struct TopNavigationBar: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var showingLanguagePicker = false

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image("logo")
                .resizable()
                .scaledToFit()
                .frame(height: 30)

            Spacer()

            Button {
                showingLanguagePicker = true
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "globe")
                        .font(.system(size: 16))
                    Text(localization.currentLanguage.rawValue.uppercased())
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                }
                .foregroundColor(DesignTokens.Text.primary)
                .frame(height: 44)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Language")

            Button {
                coordinator.navigate(to: .playlist)
            } label: {
                Image(systemName: "music.note.list")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel(localization.t("common.playlist"))

            Button {
                coordinator.selectedTab = .zehAni
            } label: {
                Image(systemName: "person.fill.viewfinder")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Zeh Ani")

            Button {
                coordinator.navigate(to: .profile)
            } label: {
                profileAvatar
            }
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
            .accessibilityLabel("Profile")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Background.primary)
        .sheet(isPresented: $showingLanguagePicker) {
            LanguageSettingsView()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(.ultraThinMaterial)
        }
    }

    @ViewBuilder
    private var profileAvatar: some View {
        if let photoURL = authManager.user?.photoURL {
            CachedAsyncImage(url: photoURL) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 32, height: 32)
                        .clipShape(Circle())
                default:
                    avatarFallback
                }
            }
        } else {
            avatarFallback
        }
    }

    private var avatarFallback: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 32, height: 32)
            .overlay(
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundColor(DesignTokens.Text.secondary)
            )
    }
}
