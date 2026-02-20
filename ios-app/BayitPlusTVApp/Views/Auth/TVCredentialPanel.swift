import AuthenticationServices
import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Left panel of the tvOS split-screen sign-in.
/// Clean, simple design optimized for 10-foot TV viewing.
struct TVCredentialPanel: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization

    let onAuthSuccess: () -> Void
    @Binding var errorMessage: String?

    @State private var email = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isLoading = false
    @State private var showingRegister = false
    @FocusState private var focusedField: Field?

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
                // Email field
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(localization.t("login.email"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .kerning(2.0)

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.muted)

                        ZStack(alignment: .leading) {
                            if email.isEmpty {
                                Text(localization.t("placeholder.email"))
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
                                .onChange(of: email) { _, _ in
                                    errorMessage = nil
                                }
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
                                    ? DesignTokens.Colors.Primary.base
                                    : DesignTokens.Glass.border,
                                lineWidth: focusedField == .email ? 2 : 1
                            )
                    )
                    .shadow(
                        color: focusedField == .email
                            ? DesignTokens.Colors.Primary.base.opacity(0.3)
                            : .clear,
                        radius: 10,
                        x: 0,
                        y: 4
                    )
                }

                // Password field
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(localization.t("login.password"))
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
                                .onChange(of: password) { _, _ in
                                    errorMessage = nil
                                }
                        } else {
                            SecureField("Enter your password", text: $password)
                                .textFieldStyle(.plain)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .onSubmit { signInWithEmail() }
                                .onChange(of: password) { _, _ in
                                    errorMessage = nil
                                }
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
                                    ? DesignTokens.Colors.Primary.base
                                    : DesignTokens.Glass.border,
                                lineWidth: focusedField == .password ? 2 : 1
                            )
                    )
                    .shadow(
                        color: focusedField == .password
                            ? DesignTokens.Colors.Primary.base.opacity(0.3)
                            : .clear,
                        radius: 10,
                        x: 0,
                        y: 4
                    )
                }
            }


            // Sign-In Buttons - Compact vertical group
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
                Button(action: { showingRegister = true }) {
                    (
                        Text(localization.t("login.newToBayitPlus") + " ")
                            .foregroundStyle(DesignTokens.Text.muted)
                        + Text(localization.t("login.createAccount"))
                            .foregroundStyle(DesignTokens.Colors.Primary.light)
                            .bold()
                    )
                }
                .font(.system(size: TVDesignTokens.FontSize.base))
                .buttonStyle(.plain)
                .focused($focusedField, equals: .createAccount)
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
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = AuthError.networkError(
                    underlying: error.localizedDescription
                ).userFacingMessage
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
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = AuthError.networkError(
                    underlying: error.localizedDescription
                ).userFacingMessage
            }
            isLoading = false
        }
    }
}
