import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Registration screen matching web app design at /register
struct RegisterView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization

    @State var name = ""
    @State var email = ""
    @State var password = ""
    @State var confirmPassword = ""
    @State var showPassword = false
    @State var showConfirmPassword = false
    @State var acceptTerms = false
    @State var validationError: String?

    let onBack: () -> Void
    let onRegisterSuccess: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxl)
                AuthComponents.LogoSection()
                glassCard
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
            RegisterFormFields(
                name: $name,
                email: $email,
                password: $password,
                confirmPassword: $confirmPassword,
                showPassword: $showPassword,
                showConfirmPassword: $showConfirmPassword,
                acceptTerms: $acceptTerms
            )
            createAccountButton
            AuthComponents.OrDivider()
            socialButtons
            signInLink
        }
        .authGlassCard()
    }

    private var cardHeader: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("register.title"))
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("register.subtitle"))
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Error

    @ViewBuilder
    private var errorMessage: some View {
        if let errorText = validationError ?? authManager.error?.userFacingMessage {
            AuthComponents.ErrorBanner(message: errorText)
        }
    }
}
