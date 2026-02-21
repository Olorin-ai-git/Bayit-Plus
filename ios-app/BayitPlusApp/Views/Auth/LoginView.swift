import BayitAuth
import BayitDesignSystem
import BayitLocalization
import LocalAuthentication
import SwiftUI

/// Login screen matching web app design at /login
struct LoginView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization

    @State var email = ""
    @State var password = ""
    @State var showPassword = false
    @State var biometricService = BiometricAuthService()

    let onRegister: () -> Void
    let onForgotPassword: () -> Void
    let onLoginSuccess: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxxl)

                AuthComponents.LogoSection()

                glassCard

                termsFooter

                Spacer(minLength: DesignTokens.Spacing.xl)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Glass Card

    private var glassCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            cardHeader
            errorMessage
            emailField
            passwordField
            signInButton
            AuthComponents.OrDivider()
            socialButtons
            signUpLink
        }
        .authGlassCard()
    }
}
