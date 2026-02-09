import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import SwiftUI
import UIKit

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
                VStack(spacing: DesignTokens.Spacing.sm) {
                    if let logoImage = UIImage(named: "logo") ?? Self.loadBundleLogo() {
                        Image(uiImage: logoImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 200, height: 100)
                    }

                    (Text("Bayit")
                        .foregroundColor(.white)
                    + Text("+")
                        .foregroundColor(DesignTokens.Colors.Primary.base))
                        .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                }

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

    // MARK: - Logo

    private static func loadBundleLogo() -> UIImage? {
        guard let url = Bundle.main.url(forResource: "logo", withExtension: "png"),
              let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}
