import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Phone number verification flow with SMS code input
struct PhoneVerificationView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @Environment(\.dismiss) private var dismiss

    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var codeSent = false
    @State private var isVerifying = false
    @State private var resendTimer = 0
    @State private var timerActive = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerView

                if codeSent {
                    codeVerificationSection
                } else {
                    phoneInputSection
                }

                if let error = error {
                    errorView(error)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "phone.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Primary.default)
            Text(localization.t("verification.phoneTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
            Text(codeSent ? localization.t("verification.enterCode") : localization.t("verification.phoneDescription"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var phoneInputSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    TextField(localization.t("verification.phonePlaceholder"), text: $phoneNumber)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                        .padding(DesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .stroke(DesignTokens.Glass.border, lineWidth: 1)
                        )
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("verification.phoneHint"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)

                    GlassButton(
                        localization.t("verification.sendCode"),
                        variant: .primary,
                        isDisabled: phoneNumber.isEmpty || isLoading,
                        isLoading: isLoading
                    ) {
                        Task { await sendVerificationCode() }
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    private var codeVerificationSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Text(localization.t("verification.codeSentTo") + " \(phoneNumber)")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)

                    TextField(localization.t("verification.codePlaceholder"), text: $verificationCode)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .padding(DesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .stroke(DesignTokens.Glass.border, lineWidth: 1)
                        )
                        .foregroundStyle(DesignTokens.Text.primary)
                        .onChange(of: verificationCode) { _, newValue in
                            if newValue.count == 6 {
                                Task { await verifyCode() }
                            }
                        }

                    GlassButton(
                        localization.t("verification.verify"),
                        variant: .primary,
                        isDisabled: verificationCode.count != 6 || isVerifying,
                        isLoading: isVerifying
                    ) {
                        Task { await verifyCode() }
                    }

                    if timerActive && resendTimer > 0 {
                        Text(localization.t("verification.resendIn") + " \(resendTimer)s")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    } else {
                        Button {
                            Task { await resendCode() }
                        } label: {
                            Text(localization.t("verification.resendCode"))
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundColor(DesignTokens.Primary.default)
                        }
                        .disabled(isLoading)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }

            Button {
                codeSent = false
                verificationCode = ""
                error = nil
            } label: {
                Text(localization.t("verification.changeNumber"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
        }
    }

    private func errorView(_ message: String) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func sendVerificationCode() async {
        isLoading = true
        error = nil

        do {
            _ = try await repos.user.sendPhoneVerification(phoneNumber: phoneNumber)
            codeSent = true
            startResendTimer()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    private func verifyCode() async {
        isVerifying = true
        error = nil

        do {
            _ = try await repos.user.verifyPhone(code: verificationCode)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }

        isVerifying = false
    }

    private func resendCode() async {
        verificationCode = ""
        await sendVerificationCode()
    }

    private func startResendTimer() {
        resendTimer = 60
        timerActive = true

        Task {
            while resendTimer > 0 {
                try? await Task.sleep(for: .seconds(1))
                resendTimer -= 1
            }
            timerActive = false
        }
    }
}
