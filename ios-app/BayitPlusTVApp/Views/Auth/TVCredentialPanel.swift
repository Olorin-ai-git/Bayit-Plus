import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import SwiftUI
import UIKit

/// Left panel of the tvOS split-screen sign-in.
/// Clean, simple design optimized for 10-foot TV viewing.
struct TVCredentialPanel: View {
    @Environment(AuthManager.self) private var authManager

    let onAuthSuccess: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case email, password, submit, apple
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            // Header
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text("Welcome Back")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, DesignTokens.Colors.Primary.light],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Sign in to continue your journey")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            // Form
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                // Email field
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text("EMAIL")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .kerning(2.0)

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.muted)

                        ZStack(alignment: .leading) {
                            if email.isEmpty {
                                Text("your@email.com")
                                    .font(.system(size: TVDesignTokens.FontSize.base))
                                    .foregroundStyle(DesignTokens.Colors.Primary.dark.opacity(0.7))
                            }
                            TextField("", text: $email)
                                .textFieldStyle(.plain)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .tint(DesignTokens.Colors.Primary.light)
                                .autocorrectionDisabled()
                                .textContentType(.emailAddress)
                                .focused($focusedField, equals: .email)
                        }
                    }
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .fill(
                                focusedField == .email
                                    ? DesignTokens.Glass.bgMedium
                                    : DesignTokens.Glass.bgLight
                            )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .stroke(
                                focusedField == .email
                                    ? DesignTokens.Glass.borderFocus
                                    : DesignTokens.Glass.border,
                                lineWidth: focusedField == .email ? 3 : 2
                            )
                    )
                }

                // Password field
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text("PASSWORD")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .kerning(2.0)

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.muted)

                        if isPasswordVisible {
                            TextField("Enter your password", text: $password)
                                .textFieldStyle(.plain)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .onSubmit { signInWithEmail() }
                        } else {
                            SecureField("Enter your password", text: $password)
                                .textFieldStyle(.plain)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .onSubmit { signInWithEmail() }
                        }

                        Button(action: { isPasswordVisible.toggle() }) {
                            Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Colors.Primary.light)
                        }
                    }
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .fill(
                                focusedField == .password
                                    ? DesignTokens.Glass.bgMedium
                                    : DesignTokens.Glass.bgLight
                            )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .stroke(
                                focusedField == .password
                                    ? DesignTokens.Glass.borderFocus
                                    : DesignTokens.Glass.border,
                                lineWidth: focusedField == .password ? 3 : 2
                            )
                    )
                }
            }

            // Error message
            if let errorMessage {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)

                    Text(errorMessage)
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(DesignTokens.Colors.Semantic.error.opacity(0.15))
                        .overlay(
                            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                                .stroke(DesignTokens.Colors.Semantic.error, lineWidth: 2)
                        )
                )
            }

            // Sign In Button
            GlassButton(
                isLoading ? "Signing in..." : "Sign In",
                variant: .primary,
                size: .large,
                isDisabled: email.isEmpty || password.isEmpty,
                isLoading: isLoading,
                icon: Image(systemName: "arrow.right.circle.fill")
            ) {
                signInWithEmail()
            }
            .focused($focusedField, equals: .submit)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
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
