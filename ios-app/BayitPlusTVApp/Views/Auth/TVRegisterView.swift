import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen registration form for tvOS.
/// Presented as a fullScreenCover from TVCredentialPanel.
/// Uses authManager.signUpWithEmail(email:password:name:) — no Google OAuth on tvOS.
struct TVRegisterView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) var localization

    let onSuccess: () -> Void
    let onBack: () -> Void

    @State var name = ""
    @State var email = ""
    @State var password = ""
    @State var confirmPassword = ""
    @State private var isLoading = false
    @State var errorMessage: String?
    @FocusState var focusedField: Field?

    enum Field: Hashable {
        case name, email, password, confirmPassword, submit
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [DesignTokens.Colors.Background.primary, Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Spacer(minLength: TVDesignTokens.Spacing.xxl)
                    titleHeader
                    errorBanner
                    formFields
                    termsText
                    createAccountButton
                    backLink
                    Spacer(minLength: TVDesignTokens.Spacing.xl)
                }
                .frame(maxWidth: 600)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    // MARK: - Header

    private var titleHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxs) {
            Text(localization.t("register.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.white, DesignTokens.Colors.Primary.light],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text(localization.t("register.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Error Banner

    @ViewBuilder
    private var errorBanner: some View {
        if let message = errorMessage ?? authManager.error?.userFacingMessage {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(.white)
                    .lineLimit(2)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(Capsule().fill(DesignTokens.Colors.Semantic.error.opacity(0.9)))
        }
    }

    // MARK: - Terms & Buttons

    private var termsText: some View {
        Text(
            localization.t("register.acceptTerms") + " "
                + localization.t("register.termsOfService")
                + " " + localization.t("register.and") + " "
                + localization.t("register.privacyPolicy")
        )
        .font(.system(size: TVDesignTokens.FontSize.sm))
        .foregroundStyle(DesignTokens.Text.muted)
        .multilineTextAlignment(.center)
    }

    private var createAccountButton: some View {
        GlassButton(
            isLoading
                ? localization.t("register.registering")
                : localization.t("register.submit"),
            variant: .primary,
            size: .medium,
            isDisabled: name.isEmpty || email.isEmpty || password.isEmpty
                || confirmPassword.isEmpty,
            isLoading: isLoading,
            icon: Image(systemName: "person.badge.plus")
        ) {
            Task { await handleRegister() }
        }
        .focused($focusedField, equals: .submit)
    }

    private var backLink: some View {
        Button(action: onBack) {
            (
                Text(localization.t("register.haveAccount") + " ")
                    .foregroundStyle(DesignTokens.Text.secondary)
                + Text(localization.t("register.signIn"))
                    .foregroundStyle(DesignTokens.Colors.Primary.light)
                    .bold()
            )
        }
        .font(.system(size: TVDesignTokens.FontSize.base))
        .buttonStyle(.plain)
    }

    // MARK: - Registration

    private func handleRegister() async {
        errorMessage = nil
        guard !name.isEmpty else {
            errorMessage = localization.t("register.errors.nameRequired")
            return
        }
        guard !email.isEmpty, email.contains("@") else {
            errorMessage = localization.t("register.errors.emailRequired")
            return
        }
        guard password.count >= 8 else {
            errorMessage = localization.t("register.errors.passwordTooShort")
            return
        }
        guard password == confirmPassword else {
            errorMessage = localization.t("register.errors.passwordMismatch")
            return
        }
        isLoading = true
        do {
            try await authManager.signUpWithEmail(
                email: email,
                password: password,
                name: name
            )
            onSuccess()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
