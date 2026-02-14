import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct BiometricConsentView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(NavigationCoordinator.self) private var coordinator
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
    @State private var familyControlsMissing = false

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        BiometricConsentExplanation()

                        if familyControlsMissing {
                            familyControlsWarning
                        }

                        BiometricConsentPINInput(pin: $pin)
                            .opacity(familyControlsMissing ? 0.4 : 1)
                            .disabled(familyControlsMissing)

                        BiometricConsentToggles(
                            meshGenerationConsent: $meshGenerationConsent,
                            voiceV2VConsent: $voiceV2VConsent,
                            latentFeaturesConsent: $latentFeaturesConsent
                        )
                        .opacity(familyControlsMissing ? 0.4 : 1)
                        .disabled(familyControlsMissing)

                        if let consents = currentConsents {
                            BiometricConsentStatusCard(consents: consents)
                        }

                        BiometricConsentSubmitButton(
                            pin: pin,
                            submitting: submitting,
                            hasAnyConsentEnabled: hasAnyConsentEnabled && !familyControlsMissing,
                            onSubmit: submitConsents
                        )

                        if let error = error {
                            Text(error)
                                .foregroundStyle(DesignTokens.ErrorColor.default)
                                .font(.system(size: DesignTokens.FontSize.sm))
                        }
                    }
                    .padding(DesignTokens.Spacing.xl)
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
            .onDisappear { pin = "" }
            .task {
                await checkFamilyControls()
                await fetchCurrentConsent()
            }
        }
    }

    private var familyControlsWarning: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("zehAni.consent.biometric.familyControlsRequired"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Warning.default)
            }
            Text(localization.t("zehAni.consent.biometric.familyControlsExplain"))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .fixedSize(horizontal: false, vertical: true)
            Button {
                dismiss()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    coordinator.navigate(to: .familyControls)
                }
            } label: {
                Text(localization.t("zehAni.consent.biometric.goToFamilyControls"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.default)
            }
        }
        .padding(DesignTokens.Spacing.base)
        .background(DesignTokens.Warning.default.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    private var hasAnyConsentEnabled: Bool {
        meshGenerationConsent || voiceV2VConsent || latentFeaturesConsent
    }

    private func checkFamilyControls() async {
        do {
            _ = try await repositories.familyControls.fetchControls()
        } catch {
            await MainActor.run { familyControlsMissing = true }
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
            case BiometricConsentType.meshGeneration.rawValue:
                meshGenerationConsent = consent.active
            case BiometricConsentType.voiceV2V.rawValue:
                voiceV2VConsent = consent.active
            case BiometricConsentType.latentFeatures.rawValue:
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
                        profileId: profileId, consentType: BiometricConsentType.meshGeneration.rawValue, pin: pin
                    )
                }
                if voiceV2VConsent {
                    _ = try await repositories.avatarMeshRepository.grantBiometricConsent(
                        profileId: profileId, consentType: BiometricConsentType.voiceV2V.rawValue, pin: pin
                    )
                }
                if latentFeaturesConsent {
                    _ = try await repositories.avatarMeshRepository.grantBiometricConsent(
                        profileId: profileId, consentType: BiometricConsentType.latentFeatures.rawValue, pin: pin
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
