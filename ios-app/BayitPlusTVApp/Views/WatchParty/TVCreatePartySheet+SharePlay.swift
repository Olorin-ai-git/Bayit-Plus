#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Extension to TVCreatePartySheet providing a combined party type selector
    /// that offers both SharePlay (FaceTime) and Bayit+ Party (WebSocket) options.
    struct TVPartyTypeSelector: View {
        @Environment(LocalizationManager.self) private var localization

        let contentId: String
        let contentType: String
        let contentTitle: String
        @Binding var isPresented: Bool
        let onCreateBayitParty: () -> Void
        let onStartSharePlay: () -> Void

        var body: some View {
            GlassModal(isPresented: $isPresented) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    headerSection

                    TVSharePlayInviteView(
                        contentId: contentId,
                        contentType: contentType,
                        contentTitle: contentTitle,
                        onStartSharePlay: {
                            isPresented = false
                            onStartSharePlay()
                        },
                        onStartBayitParty: {
                            isPresented = false
                            onCreateBayitParty()
                        }
                    )

                    cancelButton
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
        }

        // MARK: - Header

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(localization.t("watchParty.chooseMethod"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("watchParty.chooseMethodDescription"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 600)
            }
        }

        // MARK: - Cancel

        private var cancelButton: some View {
            GlassButton(
                localization.t("watchParty.cancel"),
                variant: .secondary,
                size: .medium
            ) {
                isPresented = false
            }
            .frame(maxWidth: 200)
            .accessibilityLabel(localization.t("watchParty.cancel"))
        }
    }
#endif
