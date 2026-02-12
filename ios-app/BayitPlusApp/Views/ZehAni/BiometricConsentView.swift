import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct BiometricConsentView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let profileId: String

    @State private var pin = ""
    @State private var meshGenerationConsent = false
    @State private var voiceV2VConsent = false
    @State private var latentFeaturesConsent = false
    @State private var currentConsents: BiometricConsentStatus?
    @State private var submitting = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        explanationSection
                        pinSection
                        consentTogglesSection
                        currentStatusSection
                        submitSection

                        if let error = error {
                            Text(error)
                                .foregroundColor(DesignTokens.Color.error)
                                .font(.system(size: 14))
                        }
                    }
                    .padding(24)
                }
            }
            .navigationTitle(localization.t("zehAni.consent.biometric.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) {
                        dismiss()
                    }
                }
            }
            .task {
                await fetchCurrentConsent()
            }
        }
    }

    private var explanationSection: some View {
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

    private var pinSection: some View {
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

    private var consentTogglesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(localization.t("zehAni.consent.biometric.consentTypes"))
                .foregroundColor(.white.opacity(0.9))
                .font(.system(size: 16, weight: .semibold))

            Toggle(localization.t("zehAni.consent.biometric.meshGeneration"), isOn: $meshGenerationConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Color.primary))

            Toggle(localization.t("zehAni.consent.biometric.voiceV2V"), isOn: $voiceV2VConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Color.primary))

            Toggle(localization.t("zehAni.consent.biometric.latentFeatures"), isOn: $latentFeaturesConsent)
                .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Color.primary))
        }
    }

    private var currentStatusSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let consents = currentConsents {
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
                            .foregroundColor(consent.active ? .green : .gray)
                            .font(.system(size: 13, weight: .medium))
                    }
                }
            }
        }
    }

    private var submitSection: some View {
        Button {
            submitConsents()
        } label: {
            Text(localization.t("zehAni.consent.biometric.submit"))
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled(pin.count < 4 || submitting || !hasAnyConsentEnabled)
    }

    private var hasAnyConsentEnabled: Bool {
        meshGenerationConsent || voiceV2VConsent || latentFeaturesConsent
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

    private func fetchCurrentConsent() async {
        do {
            let consents = try await repositories.avatarMeshRepository.checkBiometricConsent(profileId: profileId)
            await MainActor.run {
                currentConsents = consents
                updateTogglesFromConsents(consents)
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
            }
        }
    }

    private func updateTogglesFromConsents(_ consents: BiometricConsentStatus) {
        for consent in consents.consents {
            switch consent.consentType {
            case "mesh_generation":
                meshGenerationConsent = consent.active
            case "voice_v2v":
                voiceV2VConsent = consent.active
            case "latent_features":
                latentFeaturesConsent = consent.active
            default:
                break
            }
        }
    }

    private func submitConsents() {
        submitting = true
        error = nil

        Task {
            do {
                if meshGenerationConsent {
                    _ = try await repositories.avatarMeshRepository.grantBiometricConsent(
                        profileId: profileId, consentType: "mesh_generation", pin: pin
                    )
                }
                if voiceV2VConsent {
                    _ = try await repositories.avatarMeshRepository.grantBiometricConsent(
                        profileId: profileId, consentType: "voice_v2v", pin: pin
                    )
                }
                if latentFeaturesConsent {
                    _ = try await repositories.avatarMeshRepository.grantBiometricConsent(
                        profileId: profileId, consentType: "latent_features", pin: pin
                    )
                }
                await fetchCurrentConsent()
                await MainActor.run {
                    submitting = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    submitting = false
                }
            }
        }
    }
}
