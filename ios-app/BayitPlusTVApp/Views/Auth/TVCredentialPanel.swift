import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import SwiftUI
import UIKit

/// Left panel of the tvOS split-screen sign-in.
/// Contains email/password form and Apple Sign-In button.
struct TVCredentialPanel: View {
    @Environment(AuthManager.self) private var authManager

    let onAuthSuccess: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            headerSection

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassTextField(
                    "Email",
                    text: $email,
                    icon: Image(systemName: "envelope")
                )
                .autocorrectionDisabled()
                .textContentType(.emailAddress)

                GlassTextField(
                    "Password",
                    text: $password,
                    isSecure: true,
                    icon: Image(systemName: "lock")
                )
                .textContentType(.password)
                .onSubmit { signInWithEmail() }
            }
            .frame(maxWidth: TVDesignTokens.Form.maxWidth)

            if let errorMessage {
                Text(errorMessage)
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .medium
                    ))
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: TVDesignTokens.Spacing.md) {
                GlassButton(
                    isLoading ? "Signing in..." : "Sign In with Email",
                    variant: .primary,
                    size: .large,
                    isDisabled: email.isEmpty || password.isEmpty,
                    isLoading: isLoading,
                    icon: Image(systemName: "envelope.fill")
                ) {
                    signInWithEmail()
                }

                GlassButton(
                    "Sign In with Apple",
                    variant: .secondary,
                    size: .large,
                    isLoading: isLoading,
                    icon: Image(systemName: "applelogo")
                ) {
                    signInWithApple()
                }
            }
            .frame(maxWidth: TVDesignTokens.Form.maxWidth)
        }
        .padding(TVDesignTokens.Spacing.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text("Sign In")
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Use your email or Apple ID")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Validation

    private var isValidEmail: Bool {
        let pattern = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        return email.range(of: pattern, options: .regularExpression) != nil
    }

    // MARK: - Actions

    private func signInWithEmail() {
        let trimmedEmail = email.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        guard !trimmedEmail.isEmpty, !password.isEmpty else { return }

        guard isValidEmail else {
            errorMessage = AuthError.invalidEmailFormat.userFacingMessage
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.signInWithEmail(
                    email: trimmedEmail,
                    password: password
                )
                onAuthSuccess()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func signInWithApple() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.signInWithApple()
                onAuthSuccess()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
