import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// MFA setup flow - choose between SMS or Authenticator App
struct MFASetupView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @State var selectedMethod: MFAMethod?
    @State var totpSetup: TwoFactorSetupResponse?
    @State var verificationCode = ""
    @State var isLoading = false
    @State var error: String?
    @State var isEnabled = false

    enum MFAMethod: String, CaseIterable {
        case totp
        case sms
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerView
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
        .task { await checkCurrentStatus() }
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

    private var methodSelectionView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            methodCard(
                icon: "lock.iphone",
                title: localization.t("mfa.authenticatorApp"),
                subtitle: localization.t("mfa.authenticatorDescription"),
                method: .totp
            )
            methodCard(
                icon: "message.fill",
                title: localization.t("mfa.sms"),
                subtitle: localization.t("mfa.smsDescription"),
                method: .sms
            )
        }
    }

    private func methodCard(icon: String, title: String, subtitle: String, method: MFAMethod) -> some View {
        GlassCard {
            Button {
                selectedMethod = method
                Task { method == .totp ? await enableTOTP() : await sendSMSCode() }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundColor(DesignTokens.Primary.default)
                        .frame(width: 40)
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(title)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
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
        }
    }
}
