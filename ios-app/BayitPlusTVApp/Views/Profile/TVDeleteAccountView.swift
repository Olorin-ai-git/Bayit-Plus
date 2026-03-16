import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Delete account confirmation screen for tvOS.
struct TVDeleteAccountView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager
    @Environment(TVNavigationCoordinator.self) private var coordinator

    let onDismiss: () -> Void

    @State private var confirmText = ""
    @State private var isDeleting = false
    @State private var error: String?
    @FocusState private var textFocused: Bool

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)

            Text(localization.t("settings.deleteAccountConfirmTitle"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)

            Text(localization.t("settings.deleteAccountConfirmMessage"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)

            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("settings.typeDeleteConfirm"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)

                TextField("DELETE", text: $confirmText)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .multilineTextAlignment(.center)
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bgMedium)
                    .cornerRadius(TVDesignTokens.Radius.md)
                    .focused($textFocused)
                    .frame(maxWidth: 400)
            }

            if let error {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.md)

                Button {
                    Task { await deleteAccount() }
                } label: {
                    Group {
                        if isDeleting {
                            ProgressView().tint(.white)
                        } else {
                            Text(localization.t("settings.deleteAccountConfirm"))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 280, height: 70)
                }
                .buttonStyle(.plain)
                .background(confirmText == "DELETE"
                    ? DesignTokens.Colors.Semantic.error
                    : DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .disabled(confirmText != "DELETE" || isDeleting)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func deleteAccount() async {
        error = nil
        isDeleting = true
        do {
            _ = try await repos.user.deleteAccount()
            await authManager.signOut()
            coordinator.profileSelected = false
            coordinator.selectedProfileId = nil
            coordinator.showingAuth = true
            coordinator.selectedTab = .home
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isDeleting = false
    }
}
