import BayitDesignSystem
import BayitLocalization
import PhotosUI
import SwiftUI

/// Multi-step avatar creation flow: consent, photo capture, style selection.
struct AvatarCreationView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let profileId: String
    let viewModel: StarStoryViewModel?

    @State private var currentStep: CreationStep = .consent
    @State private var consentAccepted = false
    @State private var childName = ""
    @State private var familyPin = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var selectedStyle: AvatarStyle = .cartoon2d
    @State private var errorMessage: String?

    private enum CreationStep: Int, CaseIterable { case consent, photo, style }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: DesignTokens.Spacing.lg) { stepIndicator; stepContent }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.vertical, DesignTokens.Spacing.xl)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("starStory.createAvatar"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }
    }

    private var stepIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(CreationStep.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(step.rawValue <= currentStep.rawValue ? DesignTokens.Primary.p400 : DesignTokens.Glass.bg)
                    .frame(height: 4)
            }
        }
    }

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .consent: consentStep
        case .photo: photoStep
        case .style: styleStep
        }
    }

    private var consentStep: some View {
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
            GlassTextField(localization.t("starStory.familyPinLabel"), text: $familyPin)
            Toggle(isOn: $consentAccepted) {
                Text(localization.t("starStory.consentCheckbox"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .tint(DesignTokens.Primary.p400)
            if let error = errorMessage {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }
            GlassButton(localization.t("common.continue"), variant: .primary, size: .large) {
                Task { await submitConsent() }
            }
            .disabled(!consentAccepted || childName.isEmpty || familyPin.isEmpty)
        }
    }

    private var photoStep: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("starStory.uploadPhoto"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: DesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text(localization.t("starStory.selectPhoto"))
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("starStory.photoHint"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .frame(maxWidth: .infinity, minHeight: 200)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .strokeBorder(DesignTokens.Glass.border, style: StrokeStyle(lineWidth: 2, dash: [8]))
                )
            }
            .onChange(of: selectedPhoto) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self) {
                        photoData = data
                        currentStep = .style
                    }
                }
            }
            GlassButton(localization.t("common.back"), variant: .secondary, size: .medium) {
                currentStep = .consent
            }
        }
    }

    private var styleStep: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("starStory.chooseStyle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            ForEach(AvatarStyle.allCases, id: \.rawValue) { style in
                styleCard(style)
            }
            GlassButton(localization.t("starStory.generateAvatar"), variant: .primary, size: .large) {
                dismiss()
            }
            GlassButton(localization.t("common.back"), variant: .secondary, size: .medium) {
                currentStep = .photo
            }
        }
    }

    private func styleCard(_ style: AvatarStyle) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: style == .cartoon2d ? "paintbrush.fill" : "cube.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(selectedStyle == style ? DesignTokens.Primary.p400 : DesignTokens.Text.muted)
                Text(style.displayName)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if selectedStyle == style {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .strokeBorder(selectedStyle == style ? DesignTokens.Primary.p400 : Color.clear, lineWidth: 2)
        )
        .onTapGesture { selectedStyle = style }
    }

    private func submitConsent() async {
        errorMessage = nil
        let success = await viewModel?.grantConsent(
            profileId: profileId, childFirstName: childName, pin: familyPin
        ) ?? false
        if success { currentStep = .photo } else { errorMessage = viewModel?.errorMessage }
    }
}
