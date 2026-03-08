import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Phone verification flow for tvOS - enter phone, receive SMS code, verify.
struct TVPhoneVerificationView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let existingPhone: String?
    let onDismiss: () -> Void
    let onVerified: () -> Void

    @State private var phoneNumber: String
    @State private var verificationCode = ""
    @State private var codeSent = false
    @State private var isLoading = false
    @State private var error: String?
    @State private var success = false
    @State private var resendCooldown = 0
    @FocusState private var phoneFocused: Bool
    @FocusState private var codeFocused: Bool

    init(existingPhone: String?, onDismiss: @escaping () -> Void, onVerified: @escaping () -> Void) {
        self.existingPhone = existingPhone
        self.onDismiss = onDismiss
        self.onVerified = onVerified
        _phoneNumber = State(initialValue: existingPhone ?? "")
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Image(systemName: "phone.badge.checkmark")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("verification.phoneTitle"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if success {
                successView
            } else if codeSent {
                codeEntryView
            } else {
                phoneEntryView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
    }

    // MARK: - Phone Entry

    private var phoneEntryView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("verification.phoneDescription"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField(localization.t("verification.phonePlaceholder"), text: $phoneNumber)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .focused($phoneFocused)
                .frame(maxWidth: 500)
                .keyboardType(.phonePad)

            Text(localization.t("verification.phoneHint"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            if let error {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }

            actionButtons(
                primaryTitle: localization.t("verification.sendCode"),
                primaryEnabled: isPhoneValid,
                primaryAction: { Task { await sendCode() } }
            )
        }
        .task { phoneFocused = true }
    }

    // MARK: - Code Entry

    private var codeEntryView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text("\(localization.t("verification.codeSentTo")) \(phoneNumber)")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField(localization.t("verification.codePlaceholder"), text: $verificationCode)
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .multilineTextAlignment(.center)
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .focused($codeFocused)
                .frame(maxWidth: 400)
                .keyboardType(.numberPad)
                .onChange(of: verificationCode) {
                    if verificationCode.count == 6 {
                        Task { await verifyCode() }
                    }
                }

            if let error {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    codeSent = false
                    verificationCode = ""
                    error = nil
                } label: {
                    Text(localization.t("verification.changeNumber"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .buttonStyle(.plain)

                if resendCooldown > 0 {
                    Text("\(localization.t("verification.resendIn")) \(resendCooldown)s")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                } else {
                    Button {
                        Task { await sendCode() }
                    } label: {
                        Text(localization.t("verification.resendCode"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .buttonStyle(.plain)
                }
            }

            actionButtons(
                primaryTitle: localization.t("verification.verify"),
                primaryEnabled: verificationCode.count == 6,
                primaryAction: { Task { await verifyCode() } }
            )
        }
        .task { codeFocused = true }
    }

    // MARK: - Success

    private var successView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Success.default)

            Text(localization.t("common.success"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Button {
                onVerified()
                onDismiss()
            } label: {
                Text(localization.t("common.done"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 220, height: 70)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Primary.p400)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
    }

    // MARK: - Shared

    private func actionButtons(primaryTitle: String, primaryEnabled: Bool, primaryAction: @escaping () -> Void) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 220, height: 70)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Glass.bgLight)
            .cornerRadius(TVDesignTokens.Radius.md)

            Button {
                primaryAction()
            } label: {
                Group {
                    if isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text(primaryTitle)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(width: 280, height: 70)
            }
            .buttonStyle(.plain)
            .background(primaryEnabled
                ? LinearGradient(colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                                 startPoint: .leading, endPoint: .trailing)
                : LinearGradient(colors: [DesignTokens.Glass.bgMedium, DesignTokens.Glass.bgMedium],
                                 startPoint: .leading, endPoint: .trailing))
            .cornerRadius(TVDesignTokens.Radius.md)
            .disabled(!primaryEnabled || isLoading)
        }
    }

    private var isPhoneValid: Bool {
        phoneNumber.count >= 10
    }

    private func sendCode() async {
        error = nil
        isLoading = true
        do {
            _ = try await repos.user.sendPhoneVerification(phoneNumber: phoneNumber)
            codeSent = true
            startResendCooldown()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }

    private func verifyCode() async {
        error = nil
        isLoading = true
        do {
            let response = try await repos.user.verifyPhone(code: verificationCode)
            if response.phoneVerified == true {
                success = true
            } else {
                error = response.message
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }

    private func startResendCooldown() {
        resendCooldown = 60
        Task {
            while resendCooldown > 0 {
                try? await Task.sleep(for: .seconds(1))
                resendCooldown -= 1
            }
        }
    }
}
