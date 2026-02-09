import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// MFA setup flow - choose between SMS or Authenticator App
struct MFASetupView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @Environment(NavigationCoordinator.self) var coordinator
    @State var selectedMethod: MFAMethod?
    @State var totpSetup: TwoFactorSetupResponse?
    @State var verificationCode = ""
    @State var isLoading = false
    @State var error: String?
    @State var isEnabled = false
    @State var phoneVerified = false
    @State var hasPhoneNumber = false

    enum MFAMethod: String, CaseIterable {
        case totp
        case sms
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerView

                if !phoneVerified || !hasPhoneNumber {
                    phoneVerificationWarning
                }

                if isEnabled {
                    enabledView
                } else if let method = selectedMethod {
                    setupView(for: method)
                } else {
                    methodSelectionView
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .task {
            await checkCurrentStatus()
            await checkPhoneVerification()
        }
    }

    private var headerView: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "shield.lefthalf.filled")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Primary.default)
            Text(localization.t("mfa.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
            Text(localization.t("mfa.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var enabledView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassBadge(text: localization.t("mfa.active"), variant: .success)
            GlassCard {
                Button { Task { await disableMFA() } } label: {
                    HStack {
                        Spacer()
                        Text(localization.t("mfa.disable"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                        Spacer()
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
        }
    }

    private var phoneVerificationWarning: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(DesignTokens.Warning.default)
                    Text(localization.t("mfa.phoneVerificationRequired"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                }

                Text(hasPhoneNumber ? localization.t("mfa.verifyPhoneToEnableMFA") : localization.t("mfa.addPhoneToEnableMFA"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(
                    localization.t("mfa.verifyPhone"),
                    variant: .secondary
                ) {
                    coordinator.pushToCurrentTab(.phoneVerification)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private var methodSelectionView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            methodCard(
                icon: "lock.iphone",
                title: localization.t("mfa.authenticatorApp"),
                subtitle: localization.t("mfa.authenticatorDescription"),
                method: .totp,
                isDisabled: !phoneVerified || !hasPhoneNumber
            )
            methodCard(
                icon: "message.fill",
                title: localization.t("mfa.sms"),
                subtitle: localization.t("mfa.smsDescription"),
                method: .sms,
                isDisabled: !phoneVerified || !hasPhoneNumber
            )
        }
    }

    private func methodCard(icon: String, title: String, subtitle: String, method: MFAMethod, isDisabled: Bool = false) -> some View {
        GlassCard {
            Button {
                guard !isDisabled else { return }
                selectedMethod = method
                Task { method == .totp ? await enableTOTP() : await sendSMSCode() }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundColor(isDisabled ? DesignTokens.Text.muted : DesignTokens.Primary.default)
                        .frame(width: 40)
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(title)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(isDisabled ? DesignTokens.Text.muted : DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
            .disabled(isDisabled)
            .opacity(isDisabled ? 0.5 : 1.0)
        }
    }

    func checkPhoneVerification() async {
        do {
            let status = try await repos.user.getVerificationStatus()
            phoneVerified = status.phoneVerified ?? false
            hasPhoneNumber = !(status.phoneNumber ?? "").isEmpty
        } catch {
            phoneVerified = false
            hasPhoneNumber = false
        }
    }
}
