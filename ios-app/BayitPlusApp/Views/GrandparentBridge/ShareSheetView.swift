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

                VStack(spacing: 24) {
                    if !pinVerified {
                        pinVerificationSection
                    } else {
                        shareActionsSection
                    }

                    if let error = error {
                        Text(error)
                            .foregroundColor(DesignTokens.ErrorColor.default)
                            .font(.system(size: 13))
                    }
                }
                .padding(24)
            }
            .navigationTitle(localization.t("grandparentBridge.share.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) { dismiss() }
                }
            }
        }
    }

    private var pinVerificationSection: some View {
        VStack(spacing: 16) {
            Text(localization.t("grandparentBridge.share.enterPin"))
                .foregroundColor(.white.opacity(0.7))
                .font(.system(size: 15))

            SecureField("", text: $pin)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: 200)
                .multilineTextAlignment(.center)

            Button(localization.t("grandparentBridge.share.pinVerified")) {
                verifyPin()
            }
            .buttonStyle(.borderedProminent)
            .disabled(pin.count < 4)
        }
    }

    private var shareActionsSection: some View {
        VStack(spacing: 16) {
            TextField(localization.t("grandparentBridge.share.title"), text: $recipientName)
                .textFieldStyle(.roundedBorder)

            Button {
                shareViaWhatsApp()
            } label: {
                Label(localization.t("grandparentBridge.share.whatsApp"), systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(sharing)

            Button {
                shareViaSystem()
            } label: {
                Label(localization.t("grandparentBridge.share.email"), systemImage: "envelope")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)

            Button {
                copyShareLink()
            } label: {
                Label(localization.t("grandparentBridge.share.copyLink"), systemImage: "doc.on.doc")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
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
