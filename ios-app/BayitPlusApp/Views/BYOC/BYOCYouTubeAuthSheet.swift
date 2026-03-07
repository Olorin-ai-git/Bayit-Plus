import BayitBYOC
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet for YouTube device authorization on iOS.
struct BYOCYouTubeAuthSheet: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var deviceCode: GoogleDeviceCode?
    @State private var isPolling = false
    @State private var isSuccess = false
    @State private var error: String?

    private let logger = BayitLogger(category: "BYOCYouTubeAuth")

    private var clientId: String {
        Bundle.main.infoDictionary?["YOUTUBE_CLIENT_ID"] as? String ?? ""
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer()
                if isSuccess {
                    successContent
                } else if let deviceCode {
                    codeContent(deviceCode)
                } else {
                    ProgressView().tint(.white)
                    Text(localization.t("byoc.youtubeRequestingCode"))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer()
            }
            .padding(DesignTokens.Spacing.xl)
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("byoc.addYouTube"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
            .task { await requestCode() }
        }
    }

    private func codeContent(_ code: GoogleDeviceCode) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "play.rectangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red)

            Text(localization.t("byoc.youtubeVisitLink"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)

            Link(code.verificationUrl, destination: URL(string: code.verificationUrl)!)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))

            Text(code.userCode)
                .font(.system(size: 40, weight: .bold, design: .monospaced))
                .foregroundStyle(DesignTokens.Text.primary)
                .tracking(6)

            if isPolling {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ProgressView().tint(.white)
                    Text(localization.t("byoc.youtubeWaiting"))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            if let error {
                Text(error)
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .font(.system(size: DesignTokens.FontSize.sm))
            }
        }
    }

    private var successContent: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Success.default)

            Text(localization.t("byoc.youtubeConnected"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            GlassButton(
                localization.t("common.done"),
                variant: .primary,
                size: .medium
            ) { dismiss() }
        }
    }

    private func requestCode() async {
        let authService = YouTubeAuthService(clientId: clientId)
        do {
            let code = try await authService.requestDeviceCode()
            deviceCode = code
            isPolling = true
            let tokens = try await authService.pollForToken(deviceCode: code)
            try await byocManager.addYouTubeSource(
                name: "YouTube",
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            )
            isSuccess = true
        } catch {
            self.error = error.localizedDescription
            logger.error("YouTube auth failed", error: error)
        }
        isPolling = false
    }
}
