import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS modal sheet for creating a new watch party.
/// Provides content ID, content type, and participant limit selection.
struct TVCreatePartySheet: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var isPresented: Bool
    let onCreate: (CreatePartyRequest) -> Void

    @State private var contentId = ""
    @State private var contentType = "movie"
    @State private var isPrivate = true
    @State private var maxParticipants = 10

    private let contentTypes = ["movie", "series", "live"]
    private let participantOptions = [5, 10, 20, 50]

    var body: some View {
        GlassModal(isPresented: $isPresented) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("watchParty.createParty"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassTextField(localization.t("watchParty.contentId"), text: $contentId)
                    .accessibilityLabel(localization.t("watchParty.contentId"))

                contentTypePicker
                participantPicker

                actionButtons
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Subviews

    private var contentTypePicker: some View {
        HStack {
            Text(localization.t("watchParty.type"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Picker("", selection: $contentType) {
                ForEach(contentTypes, id: \.self) { type in
                    Text(type.capitalized).tag(type)
                }
            }
            .tint(DesignTokens.Text.primary)
            .accessibilityLabel("Content type")
        }
    }

    private var participantPicker: some View {
        HStack {
            Text(localization.t("watchParty.maxGuests"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Picker("", selection: $maxParticipants) {
                ForEach(participantOptions, id: \.self) { count in
                    Text(String(count)).tag(count)
                }
            }
            .tint(DesignTokens.Text.primary)
            .accessibilityLabel("Maximum participants")
        }
    }

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            GlassButton(
                localization.t("common.cancel"),
                variant: .secondary,
                size: .medium,
                action: { isPresented = false }
            )
            .tvFocusStyle()
            .accessibilityLabel("Cancel creating party")

            GlassButton(
                localization.t("common.create"),
                variant: .primary,
                size: .medium,
                isDisabled: contentId.trimmingCharacters(in: .whitespaces).isEmpty,
                action: handleCreate
            )
            .tvFocusStyle()
            .accessibilityLabel("Create watch party")
        }
    }

    // MARK: - Actions

    private func handleCreate() {
        let request = CreatePartyRequest(
            contentId: contentId.trimmingCharacters(in: .whitespaces),
            contentType: contentType,
            isPrivate: isPrivate,
            maxParticipants: maxParticipants,
            chatEnabled: true,
            syncPlayback: true
        )
        onCreate(request)
    }
}
