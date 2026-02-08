import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal sheet for creating a new watch party with content selection.
struct CreatePartySheet: View {
    @Binding var isPresented: Bool
    let onCreate: (CreatePartyRequest) -> Void

    @Environment(\.localizationManager) private var localization

    @State private var contentId = ""
    @State private var contentType = "movie"
    @State private var isPrivate = true
    @State private var maxParticipants = 10

    private let contentTypes = ["movie", "series", "live"]
    private let participantOptions = [5, 10, 20, 50]

    var body: some View {
        GlassModal(isPresented: $isPresented) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization?.t("watchParty.createTitle") ?? "Create Watch Party")
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassTextField(
                    localization?.t("watchParty.contentIdPlaceholder") ?? "Content ID",
                    text: $contentId
                )
                .accessibilityLabel("Content ID")

                contentTypePicker
                participantPicker

                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassButton(
                        localization?.t("common.cancel") ?? "Cancel",
                        variant: .secondary,
                        size: .medium,
                        action: { isPresented = false }
                    )
                    .accessibilityLabel("Cancel creating party")

                    GlassButton(
                        localization?.t("watchParty.create") ?? "Create",
                        variant: .primary,
                        size: .medium,
                        isDisabled: contentId.trimmingCharacters(in: .whitespaces).isEmpty,
                        action: handleCreate
                    )
                    .accessibilityLabel("Create watch party")
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Subviews

    private var contentTypePicker: some View {
        HStack {
            Text(localization?.t("watchParty.contentType") ?? "Type")
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Picker("", selection: $contentType) {
                ForEach(contentTypes, id: \.self) { Text($0.capitalized).tag($0) }
            }
            .tint(DesignTokens.Text.primary)
            .accessibilityLabel("Content type")
        }
    }

    private var participantPicker: some View {
        HStack {
            Text(localization?.t("watchParty.maxParticipants") ?? "Max guests")
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Picker("", selection: $maxParticipants) {
                ForEach(participantOptions, id: \.self) { Text(String($0)).tag($0) }
            }
            .tint(DesignTokens.Text.primary)
            .accessibilityLabel("Maximum participants")
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
