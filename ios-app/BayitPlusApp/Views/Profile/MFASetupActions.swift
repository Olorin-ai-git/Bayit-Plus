import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on MFASetupView providing the setup detail views and async actions.
extension MFASetupView {

    @ViewBuilder
    func setupView(for method: MFAMethod) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if method == .totp, let setup = totpSetup {
                GlassCard {
                    VStack(spacing: DesignTokens.Spacing.md) {
                        Text(localization.t("mfa.scanQRCode"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                        if let qrCode = setup.qrCode {
                            Text(qrCode)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.secondary)
                                .textSelection(.enabled)
                                .lineLimit(nil)
                        }
                        if let secret = setup.secret {
                            VStack(spacing: DesignTokens.Spacing.xxs) {
                                Text(localization.t("mfa.manualEntry"))
                                    .font(.system(size: DesignTokens.FontSize.xs))
                                    .foregroundColor(DesignTokens.Text.muted)
                                Text(secret)
                                    .font(.system(size: DesignTokens.FontSize.sm, design: .monospaced))
                                    .foregroundColor(DesignTokens.Primary.default)
                                    .textSelection(.enabled)
                            }
                        }
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }

            if method == .sms {
                GlassCard {
                    Text(localization.t("mfa.smsCodeSent"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(DesignTokens.Spacing.md)
                }
            }

            verificationCodeInput(method: method)

            Button {
                selectedMethod = nil
                totpSetup = nil
                verificationCode = ""
                error = nil
            } label: {
                Text(localization.t("common.back"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
        }
    }

    private func verificationCodeInput(method: MFAMethod) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                TextField(localization.t("mfa.enterCode"), text: $verificationCode)
                    .keyboardType(.numberPad)
                    .font(.system(size: DesignTokens.FontSize.xl, design: .monospaced))
                    .foregroundColor(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .padding(DesignTokens.Spacing.md)

                if let error = error {
                    Text(error)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.ErrorColor.default)
                }

                Button {
                    Task { await verifyCode(method: method) }
                } label: {
                    HStack {
                        Spacer()
                        if isLoading {
                            ProgressView().tint(DesignTokens.Text.primary)
                        } else {
                            Text(localization.t("mfa.verify"))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                                .foregroundColor(DesignTokens.Text.primary)
                        }
                        Spacer()
                    }
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Primary.default)
                    .cornerRadius(DesignTokens.Radius.md)
                }
                .disabled(verificationCode.count < 6 || isLoading)
                .opacity(verificationCode.count < 6 ? 0.5 : 1.0)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Actions

    func checkCurrentStatus() async {
        do {
            let settings = try await repos.securitySettings.fetchSettings()
            isEnabled = settings.twoFactorEnabled ?? false
        } catch {
            self.error = error.localizedDescription
        }
    }

    func enableTOTP() async {
        isLoading = true
        error = nil
        do {
            totpSetup = try await repos.securitySettings.enable2FA()
        } catch {
            self.error = error.localizedDescription
            selectedMethod = nil
        }
        isLoading = false
    }

    func sendSMSCode() async {
        isLoading = true
        error = nil
        do {
            try await repos.securitySettings.sendSMS2FA()
        } catch {
            self.error = error.localizedDescription
            selectedMethod = nil
        }
        isLoading = false
    }

    func verifyCode(method: MFAMethod) async {
        isLoading = true
        error = nil
        do {
            if method == .sms {
                try await repos.securitySettings.verifySMS2FA(code: verificationCode)
            } else {
                try await repos.securitySettings.verify2FA(code: verificationCode)
            }
            isEnabled = true
            selectedMethod = nil
            totpSetup = nil
            verificationCode = ""
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func disableMFA() async {
        isLoading = true
        error = nil
        do {
            try await repos.securitySettings.disable2FA()
            isEnabled = false
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
