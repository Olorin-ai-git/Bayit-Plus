import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import SwiftUI

/// tvOS authentication view.
/// Apple TV supports Apple Sign-In and email/password login.
/// Google Sign-In with presenting VC is not available on tvOS.
struct TVAuthView: View {
    @Environment(AuthManager.self) private var authManager

    let onAuthSuccess: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    DesignTokens.Colors.Background.primary,
                    Color.black,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.xxxl) {
                Text("Bayit+")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                DesignTokens.Colors.Primary.light,
                                DesignTokens.Colors.Primary.base,
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )

                VStack(spacing: DesignTokens.Spacing.xl) {
                    TextField("Email", text: $email)
                        .autocorrectionDisabled()

                    SecureField("Password", text: $password)
                }
                .frame(maxWidth: 600)

                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                        .font(.callout)
                }

                VStack(spacing: DesignTokens.Spacing.lg) {
                    Button(action: signInWithEmail) {
                        Text(isLoading ? "Signing in..." : "Sign In with Email")
                            .font(.headline)
                            .frame(maxWidth: 400)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)

                    Button(action: signInWithApple) {
                        HStack(spacing: DesignTokens.Spacing.sm) {
                            Image(systemName: "applelogo")
                            Text("Sign In with Apple")
                        }
                        .font(.headline)
                        .frame(maxWidth: 400)
                    }
                    .disabled(isLoading)
                }
            }
            .padding(DesignTokens.Spacing.xxxxl)
        }
    }

    // MARK: - Actions

    private func signInWithEmail() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.signInWithEmail(
                    email: email,
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
