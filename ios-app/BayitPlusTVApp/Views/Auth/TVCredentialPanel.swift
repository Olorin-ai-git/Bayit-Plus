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
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
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
                isLoading ? "Signing in..." : "Sign In",
                variant: .primary,
                size: .medium,
                isDisabled: email.isEmpty || password.isEmpty,
                isLoading: isLoading,
                icon: Image(systemName: "arrow.right.circle.fill")
            ) {
                signInWithEmail()
            }
            .focused($focusedField, equals: .submit)
            .shadow(
                color: focusedField == .submit
                    ? DesignTokens.Colors.Primary.base.opacity(0.6)
                    : DesignTokens.Colors.Primary.base.opacity(0.2),
                radius: focusedField == .submit ? 25 : 15,
                x: 0,
                y: focusedField == .submit ? 10 : 6
            )
            .scaleEffect(focusedField == .submit ? 1.05 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: focusedField)

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
            .shadow(
                color: focusedField == .apple
                    ? DesignTokens.Colors.Primary.base.opacity(0.5)
                    : .clear,
                radius: 20,
                x: 0,
                y: 8
            )
            .scaleEffect(focusedField == .apple ? 1.05 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: focusedField)
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
}
