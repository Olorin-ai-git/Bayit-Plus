import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Registration screen
struct RegisterView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var validationError: String?

    let onBack: () -> Void
    let onRegisterSuccess: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            HStack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)

            Spacer()

            VStack(spacing: 8) {
                Text("Create Account")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)

                Text("Join Bayit+ streaming")
                    .font(.system(size: 16))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
            }

            VStack(spacing: 12) {
                formField(
                    icon: "person",
                    placeholder: "Full Name",
                    text: $name,
                    contentType: .name
                )

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
                    contentType: .newPassword
                )

                secureFormField(
                    icon: "lock.fill",
                    placeholder: "Confirm Password",
                    text: $confirmPassword,
                    contentType: .newPassword
                )
            }
            .padding(.horizontal, 24)

            if let errorMessage = validationError ?? authManager.error?.userFacingMessage {
                Text(errorMessage)
                    .font(.system(size: 13))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    .padding(.horizontal, 24)
            }

            Button(action: { Task { await handleRegister() } }) {
                HStack {
                    if authManager.isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.8)
                    }
                    Text("Create Account")
                        .font(.system(size: 16, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.white)
                .background(DesignTokens.Colors.Primary.base)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            }
            .disabled(authManager.isLoading)
            .padding(.horizontal, 24)

            Button(action: onBack) {
                Text("Already have an account? ")
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                + Text("Sign in")
                    .foregroundStyle(DesignTokens.Colors.Primary.light)
                    .bold()
            }
            .font(.system(size: 14))

            Spacer()
        }
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

    // MARK: - Action

    private func handleRegister() async {
        validationError = nil

        guard !name.isEmpty else {
            validationError = "Please enter your name"
            return
        }
        guard !email.isEmpty else {
            validationError = "Please enter your email"
            return
        }
        guard !password.isEmpty else {
            validationError = "Please enter a password"
            return
        }
        guard password == confirmPassword else {
            validationError = "Passwords do not match"
            return
        }

        do {
            try await authManager.signInWithEmail(email: email, password: password)
            onRegisterSuccess()
        } catch {
            // AuthManager sets its own error state
        }
    }
}
