import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS modal sheet for joining an existing watch party by room code.
struct TVJoinPartySheet: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var isPresented: Bool
    let onJoin: (String) -> Void

    @State private var roomCode = ""

    var body: some View {
        GlassModal(isPresented: $isPresented) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("watchParty.join"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("watchParty.enterCode"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassTextField(localization.t("watchParty.roomCode"), text: $roomCode)
                    .accessibilityLabel("Room code")

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    GlassButton(
                        "Cancel",
                        variant: .secondary,
                        size: .medium,
                        action: { isPresented = false }
                    )
                    .tvFocusStyle()
                    .accessibilityLabel("Cancel joining party")

                    GlassButton(
                        "Join",
                        variant: .primary,
                        size: .medium,
                        isDisabled: roomCode.trimmingCharacters(in: .whitespaces).isEmpty,
                        action: handleJoin
                    )
                    .tvFocusStyle()
                    .accessibilityLabel("Join watch party")
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
    }

    private func handleJoin() {
        let code = roomCode.trimmingCharacters(in: .whitespaces)
        guard !code.isEmpty else { return }
        onJoin(code)
    }
}
