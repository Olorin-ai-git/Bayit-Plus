import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct BiometricConsentExplanation: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localization.t("zehAni.consent.biometric.explanation"))
                .foregroundColor(.white.opacity(0.85))
                .font(.system(size: 15))
                .fixedSize(horizontal: false, vertical: true)

            Text(localization.t("zehAni.consent.biometric.privacy"))
                .foregroundColor(.white.opacity(0.7))
                .font(.system(size: 13))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

struct BiometricConsentPINInput: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var pin: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(localization.t("zehAni.consent.biometric.pinLabel"))
                .foregroundColor(.white.opacity(0.9))
                .font(.system(size: 14, weight: .medium))

            SecureField(localization.t("zehAni.consent.biometric.pinPlaceholder"), text: $pin)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: 200)
        }
    }
}

struct BiometricConsentToggles: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var meshGenerationConsent: Bool
    @Binding var voiceV2VConsent: Bool
    @Binding var latentFeaturesConsent: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(localization.t("zehAni.consent.biometric.consentTypes"))
                .foregroundColor(.white.opacity(0.9))
                .font(.system(size: 16, weight: .semibold))

            Toggle(localization.t("zehAni.consent.biometric.meshGeneration"), isOn: $meshGenerationConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Colors.Primary.base))

            Toggle(localization.t("zehAni.consent.biometric.voiceV2V"), isOn: $voiceV2VConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Colors.Primary.base))

            Toggle(localization.t("zehAni.consent.biometric.latentFeatures"), isOn: $latentFeaturesConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Colors.Primary.base))
        }
    }
}

struct BiometricConsentStatusCard: View {
    @Environment(LocalizationManager.self) private var localization

    let consents: BiometricConsentStatus

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localization.t("zehAni.consent.biometric.currentStatus"))
                .foregroundColor(.white.opacity(0.9))
                .font(.system(size: 14, weight: .medium))

            ForEach(consents.consents) { consent in
                HStack {
                    Text(consentTypeLabel(consent.consentType))
                        .foregroundColor(.white.opacity(0.7))
                        .font(.system(size: 13))
                    Spacer()
                    Text(consent.active ? localization.t("common.active") : localization.t("common.inactive"))
                        .foregroundColor(consent.active ? DesignTokens.Success.default : DesignTokens.Text.muted)
                        .font(.system(size: 13, weight: .medium))
                }
            }
        }
    }

    private func consentTypeLabel(_ type: String) -> String {
        switch type {
        case "mesh_generation":
            return localization.t("zehAni.consent.biometric.meshGeneration")
        case "voice_v2v":
            return localization.t("zehAni.consent.biometric.voiceV2V")
        case "latent_features":
            return localization.t("zehAni.consent.biometric.latentFeatures")
        default:
            return type
        }
    }
}

struct BiometricConsentSubmitButton: View {
    @Environment(LocalizationManager.self) private var localization

    let pin: String
    let submitting: Bool
    let hasAnyConsentEnabled: Bool
    let onSubmit: () -> Void

    var body: some View {
        Button {
            onSubmit()
        } label: {
            Text(localization.t("zehAni.consent.biometric.submit"))
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled(pin.count < 4 || submitting || !hasAnyConsentEnabled)
    }
}
