import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

struct ShareSheetView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let clip: BridgeNewsClip
    let repository: any GrandparentBridgeRepository

    @State private var pin = ""
    @State private var pinVerified = false
    @State private var recipientName = ""
    @State private var sharing = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: DesignTokens.Spacing.xl) {
                    if !pinVerified {
                        pinVerificationSection
                    } else {
                        shareActionsSection
                    }

                    if let error = error {
                        Text(error)
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .font(.system(size: DesignTokens.FontSize.sm))
                    }
                }
                .padding(DesignTokens.Spacing.xl)
            }
            .navigationTitle(localization.t("grandparentBridge.share.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) { dismiss() }
                }
            }
            .onDisappear {
                pin = ""
            }
        }
    }

    private var pinVerificationSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("grandparentBridge.share.enterPin"))
                .foregroundStyle(DesignTokens.Text.secondary)
                .font(.system(size: DesignTokens.FontSize.base))

            GlassTextField("", text: $pin, isSecure: true)
                .frame(maxWidth: 200)

            GlassButton(
                localization.t("grandparentBridge.share.pinVerified"),
                variant: .primary,
                size: .medium,
                isDisabled: pin.count < 4
            ) {
                verifyPin()
            }
        }
    }

    private var shareActionsSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            GlassTextField(localization.t("grandparentBridge.share.title"), text: $recipientName)

            GlassButton(
                localization.t("grandparentBridge.share.whatsApp"),
                variant: .primary,
                size: .large,
                isLoading: sharing,
                icon: Image(systemName: "square.and.arrow.up")
            ) {
                shareViaWhatsApp()
            }

            GlassButton(
                localization.t("grandparentBridge.share.email"),
                variant: .secondary,
                size: .large,
                icon: Image(systemName: "envelope")
            ) {
                shareViaSystem()
            }

            GlassButton(
                localization.t("grandparentBridge.share.copyLink"),
                variant: .secondary,
                size: .large,
                icon: Image(systemName: "doc.on.doc")
            ) {
                copyShareLink()
            }
        }
    }

    private func verifyPin() {
        guard let shareUrl = clip.shareUrl,
              let token = shareUrl.components(separatedBy: "/share/").last else { return }
        Task {
            do {
                let result = try await repository.verifyPin(token: token, pin: pin)
                await MainActor.run { pinVerified = result }
            } catch {
                await MainActor.run { self.error = error.localizedDescription }
            }
        }
    }

    private func shareViaWhatsApp() {
        sharing = true
        Task {
            do {
                let result = try await repository.shareClip(
                    clipId: clip.id, recipientName: recipientName, language: "he"
                )
                await MainActor.run {
                    sharing = false
                    if let url = URL(string: result.whatsappLink) {
                        UIApplication.shared.open(url)
                    }
                }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; sharing = false }
            }
        }
    }

    private func shareViaSystem() {
        guard let shareUrl = clip.shareUrl else { return }
        let message = localization.t("grandparentBridge.share.shareMessage", ["name": recipientName])
        let items: [Any] = [message, shareUrl]
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(controller, animated: true)
        }
    }

    private func copyShareLink() {
        guard let shareUrl = clip.shareUrl else { return }
        UIPasteboard.general.string = shareUrl
    }
}
