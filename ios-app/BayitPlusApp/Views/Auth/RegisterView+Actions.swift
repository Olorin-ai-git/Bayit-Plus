import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Buttons & Actions

extension RegisterView {
    var createAccountButton: some View {
        Button(action: { Task { await handleRegister() } }) {
            HStack {
                if authManager.isLoading {
                    ProgressView().tint(.black).scaleEffect(0.8)
                }
                Text(localization.t("register.submit"))
                    .font(.system(size: 16, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .foregroundStyle(.black)
            .background(DesignTokens.Colors.Primary.base)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
        }
        .disabled(authManager.isLoading)
        .opacity(authManager.isLoading ? 0.7 : 1.0)
    }

    var socialButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            AuthComponents.SocialButton(
                title: localization.t("register.continueWithGoogle"),
                iconName: "g.circle.fill",
                action: {
                    Task { try? await handleGoogleSignIn() }
                }
            )
            AuthComponents.SocialButton(
                title: localization.t("login.continueWithApple"),
                iconName: "apple.logo",
                action: {
                    Task { try? await handleAppleSignIn() }
                }
            )
        }
    }

    var signInLink: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)
                .padding(.bottom, DesignTokens.Spacing.lg)

            Button(action: onBack) {
                Text(localization.t("register.haveAccount") + " ")
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    + Text(localization.t("register.signIn"))
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
                    .bold()
            }
            .font(.system(size: 14))
        }
    }

    // MARK: - Action Handlers

    func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        onRegisterSuccess()
    }

    func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        onRegisterSuccess()
    }

    func handleRegister() async {
        validationError = nil
        guard !name.isEmpty else { validationError = localization.t("register.errors.nameRequired"); return }
        guard !email.isEmpty else { validationError = localization.t("register.errors.emailRequired"); return }
        guard !password.isEmpty else { validationError = localization.t("register.errors.passwordRequired"); return }
        guard password.count >= 8 else {
            validationError = localization.t("register.errors.passwordTooShort"); return
        }
        guard password == confirmPassword else {
            validationError = localization.t("register.errors.passwordMismatch"); return
        }
        guard acceptTerms else {
            validationError = localization.t("register.errors.acceptTerms"); return
        }

        do {
            try await authManager.signInWithEmail(email: email, password: password)
            onRegisterSuccess()
        } catch {
            // AuthManager sets its own error state
        }
    }
}
