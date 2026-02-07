import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Login screen with Google, Apple, and email sign-in
struct LoginView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var email = ""
    @State private var password = ""

    let onRegister: () -> Void
    let onLoginSuccess: () -> Void

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            logoSection
            socialButtons
            divider
            emailFields

            if let error = authManager.error {
                Text(error.userFacingMessage)
                    .font(.system(size: 13))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    .padding(.horizontal, 24)
            }

            loginButton
                .padding(.horizontal, 24)

            registerLink

            Spacer()
        }
    }

    // MARK: - Logo

    private var logoSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "play.tv.fill")
                .font(.system(size: 56))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            DesignTokens.Colors.Primary.base,
                            DesignTokens.Colors.Primary.light,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("Bayit+")
                .font(.system(size: 36, weight: .bold))
                .foregroundStyle(.white)

            Text("Premium Jewish Streaming")
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
    }

    // MARK: - Social Buttons

    private var socialButtons: some View {
        VStack(spacing: 12) {
            socialButton(
                title: "Continue with Google",
                iconName: "g.circle.fill",
                backgroundColor: .white.opacity(0.1)
            ) {
                Task { try await handleGoogleSignIn() }
            }

            socialButton(
                title: "Continue with Apple",
                iconName: "apple.logo",
                backgroundColor: .white.opacity(0.1)
            ) {
                Task { try await handleAppleSignIn() }
            }
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Divider

    private var divider: some View {
        HStack {
            Rectangle()
                .fill(Color.white.opacity(0.2))
                .frame(height: 1)
            Text("or")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
            Rectangle()
                .fill(Color.white.opacity(0.2))
                .frame(height: 1)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Email Fields

    private var emailFields: some View {
        VStack(spacing: 12) {
            formField(
                icon: "envelope",
                placeholder: "Email",
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )

            secureFormField(
                icon: "lock",
                placeholder: "Password",
                text: $password,
                contentType: .password
            )
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Login Button

    private var loginButton: some View {
        Button(action: { Task { try await handleEmailLogin() } }) {
            HStack {
                if authManager.isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                }
                Text("Sign In")
                    .font(.system(size: 16, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .background(DesignTokens.Colors.Primary.base)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        }
        .disabled(authManager.isLoading)
    }

    // MARK: - Register Link

    private var registerLink: some View {
        Button(action: onRegister) {
            Text("Don't have an account? ")
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
            + Text("Sign up")
                .foregroundStyle(DesignTokens.Colors.Primary.light)
                .bold()
        }
        .font(.system(size: 14))
    }

    // MARK: - Form Fields

    private func formField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        contentType: UITextContentType? = nil,
        keyboardType: UIKeyboardType = .default
    ) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
            TextField(placeholder, text: text)
                .textContentType(contentType)
                .keyboardType(keyboardType)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
        .font(.system(size: 14))
        .foregroundStyle(.white)
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(DesignTokens.Colors.Glass.background)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Colors.Glass.border, lineWidth: 1)
        )
    }

    private func secureFormField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        contentType: UITextContentType? = nil
    ) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
            SecureField(placeholder, text: text)
                .textContentType(contentType)
        }
        .font(.system(size: 14))
        .foregroundStyle(.white)
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(DesignTokens.Colors.Glass.background)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Colors.Glass.border, lineWidth: 1)
        )
    }

    // MARK: - Social Button

    private func socialButton(
        title: String,
        iconName: String,
        backgroundColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: iconName)
                    .font(.system(size: 20))
                Text(title)
                    .font(.system(size: 15, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
        }
    }

    // MARK: - Actions

    private func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        onLoginSuccess()
    }

    private func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        onLoginSuccess()
    }

    private func handleEmailLogin() async throws {
        guard !email.isEmpty, !password.isEmpty else { return }
        try await authManager.signInWithEmail(email: email, password: password)
        onLoginSuccess()
    }
}
