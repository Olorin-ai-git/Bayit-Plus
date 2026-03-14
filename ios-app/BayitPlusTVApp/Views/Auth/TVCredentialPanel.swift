import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Left panel of the tvOS split-screen sign-in.
/// Clean, simple design optimized for 10-foot TV viewing.
struct TVCredentialPanel: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization

    let onAuthSuccess: () -> Void
    @Binding var errorMessage: String?

    @State var email = ""
    @State var password = ""
    @State var isPasswordVisible = false
    @State var isLoading = false
    @State var showingRegister = false
    @State private var showLanguagePicker = false
    @FocusState var focusedField: Field?

    enum Field: Hashable {
        case email, password, submit, apple, createAccount
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                // Header
                VStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("login.title"))
                        .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, DesignTokens.Colors.Primary.light],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    Text(localization.t("login.subtitle"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                // Form
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    emailField
                    passwordField
                }

                // Sign-In Buttons
                signInButtons

                createAccountLink

                languagePickerLink
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .fullScreenCover(isPresented: $showLanguagePicker) {
            TVSignInLanguagePickerSheet(onDismiss: { showLanguagePicker = false })
        }
        .fullScreenCover(isPresented: $showingRegister) {
            TVRegisterView(
                onSuccess: {
                    showingRegister = false
                    onAuthSuccess()
                },
                onBack: { showingRegister = false }
            )
        }
    }

    // MARK: - Sign-In Buttons

    private var signInButtons: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            GlassButton(
                isLoading ? localization.t("auth.signingIn") : localization.t("auth.signIn"),
                variant: .primary,
                size: .medium,
                isDisabled: email.isEmpty || password.isEmpty,
                isLoading: isLoading,
                icon: Image(systemName: "arrow.right.circle.fill")
            ) {
                signInWithEmail()
            }
            .focused($focusedField, equals: .submit)

            GlassButton(
                localization.t("login.continueWithApple"),
                variant: .secondary,
                size: .medium,
                isDisabled: isLoading,
                icon: Image(systemName: "apple.logo")
            ) {
                signInWithApple()
            }
            .focused($focusedField, equals: .apple)
        }
    }

    // MARK: - Create Account Link

    private var createAccountLink: some View {
        Button(action: { showingRegister = true }) {
            Text(localization.t("login.newToBayitPlus") + " ")
                .foregroundStyle(DesignTokens.Text.muted)
                + Text(localization.t("login.createAccount"))
                .foregroundStyle(DesignTokens.Colors.Primary.light)
                .bold()
        }
        .font(.system(size: TVDesignTokens.FontSize.base))
        .buttonStyle(.plain)
        .focused($focusedField, equals: .createAccount)
    }

    // MARK: - Language Picker

    private var languagePickerLink: some View {
        Button { showLanguagePicker = true } label: {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "globe")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                Text(localization.currentLanguage.displayName)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            }
            .foregroundStyle(DesignTokens.Text.muted)
        }
        .buttonStyle(.plain)
    }
}
