import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarCreationView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let profileId: String
    let viewModel: StarStoryViewModel?
    var skipConsent: Bool = false
    var existingAvatarId: String?

    @State private var currentStep: CreationStep = .consent
    @State private var consentAccepted = false
    @State private var childName = ""
    @State private var familyPin = ""
    @State private var avatarId: String?
    @State private var errorMessage: String?
    @State private var videoData: Data?
    @State private var isUploading = false
    @State private var showMeshGeneration = false

    private enum CreationStep: Int, CaseIterable {
        case consent, recordVideo, processing
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                VStack(spacing: DesignTokens.Spacing.lg) { stepIndicator; stepContent }
            }
            .navigationTitle(localization.t("starStory.createAvatar"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .sheet(isPresented: $showMeshGeneration) {
                if let id = avatarId {
                    MeshGenerationView(avatarId: id, profileId: profileId)
                }
            }
            .onChange(of: showMeshGeneration) { _, showing in
                if !showing { dismiss() }
            }
            .onAppear {
                if skipConsent, let existing = existingAvatarId {
                    avatarId = existing
                    currentStep = .recordVideo
                }
            }
        }
    }

    private var stepIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(CreationStep.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(step.rawValue <= currentStep.rawValue
                        ? DesignTokens.Primary.p400 : DesignTokens.Glass.bg)
                    .frame(height: 4)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .consent: consentStep
        case .recordVideo: recordVideoStep
        case .processing:
            VideoProcessingStepView(
                isUploading: isUploading,
                errorMessage: errorMessage,
                onRetry: { Task { await processVideo() } }
            )
        }
    }

    // MARK: - Consent Step

    private var consentStep: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: "checkmark.shield")
                    .font(.system(size: DesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(localization.t("starStory.consentTitle"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("starStory.consentBody"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                GlassTextField(localization.t("starStory.childNameLabel"), text: $childName)
                GlassTextField(localization.t("starStory.familyPinLabel"), text: $familyPin, isSecure: true)
                Toggle(isOn: $consentAccepted) {
                    Text(localization.t("starStory.consentCheckbox"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .tint(DesignTokens.Primary.p400)
                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
                GlassButton(localization.t("common.continue"), variant: .primary, size: .large) {
                    Task { await submitConsent() }
                }
                .disabled(!consentAccepted || childName.isEmpty || familyPin.isEmpty)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Record Video Step

    private var recordVideoStep: some View {
        VStack(spacing: 0) {
            Text(localization.t("avatar.selfie.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.top, DesignTokens.Spacing.md)
            Text(localization.t("avatar.selfie.instructions"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.sm)
            SelfieRecorderView(
                onVideoRecorded: { data in
                    videoData = data
                    currentStep = .processing
                    Task { await processVideo() }
                },
                onCancel: { currentStep = .consent }
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.md)
        }
    }

    // MARK: - Actions

    private func submitConsent() async {
        errorMessage = nil
        let response = await viewModel?.grantConsentFull(
            profileId: profileId, childFirstName: childName, pin: familyPin
        )
        if let response, response.success {
            avatarId = response.avatarId
            currentStep = .recordVideo
        } else {
            errorMessage = viewModel?.errorMessage
        }
    }

    private func processVideo() async {
        guard let videoData, let avatarId else { return }
        isUploading = true
        errorMessage = nil

        let success = await viewModel?.processVideoAndGenerateMesh(
            avatarId: avatarId, videoData: videoData,
            profileId: profileId, pin: familyPin,
            meshRepo: repos.avatarMeshRepository
        ) ?? false

        if success {
            self.videoData = nil
            familyPin = ""
            isUploading = false
            showMeshGeneration = true
        } else {
            isUploading = false
            errorMessage = viewModel?.errorMessage
        }
    }
}
