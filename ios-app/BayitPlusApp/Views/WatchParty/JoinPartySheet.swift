import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal sheet for joining an existing watch party by room code.
struct JoinPartySheet: View {
    @Binding var isPresented: Bool
    let onJoin: (String) -> Void

    @Environment(\.localizationManager) private var localization
    @State private var roomCode = ""

    var body: some View {
        GlassModal(isPresented: $isPresented) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization?.t("watchParty.joinTitle") ?? "Join Watch Party")
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization?.t("watchParty.joinSubtitle") ?? "Enter the room code shared by the host")
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassTextField(
                    localization?.t("watchParty.roomCodePlaceholder") ?? "Room Code",
                    text: $roomCode
                )
                .accessibilityLabel("Room code")

                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassButton(
                        localization?.t("common.cancel") ?? "Cancel",
                        variant: .secondary,
                        size: .medium,
                        action: { isPresented = false }
                    )
                    .accessibilityLabel("Cancel joining party")

                    GlassButton(
                        localization?.t("watchParty.join") ?? "Join",
                        variant: .primary,
                        size: .medium,
                        isDisabled: roomCode.trimmingCharacters(in: .whitespaces).isEmpty,
                        action: handleJoin
                    )
                    .accessibilityLabel("Join watch party")
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func handleJoin() {
        let code = roomCode.trimmingCharacters(in: .whitespaces)
        guard !code.isEmpty else { return }
        onJoin(code)
    }
}
