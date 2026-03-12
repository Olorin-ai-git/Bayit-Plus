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
    @State private var generateInteractionMoments = false
    @State private var pollTask: Task<Void, Never>?

    private let logger = BayitLogger(category: "BYOCYouTubeAuth")

    private var clientId: String {
        Bundle.main.infoDictionary?["YOUTUBE_CLIENT_ID"] as? String ?? ""
    }

    private var clientSecret: String {
        Bundle.main.infoDictionary?["YOUTUBE_CLIENT_SECRET"] as? String ?? ""
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
                    Button(localization.t("common.cancel")) {
                        pollTask?.cancel()
                        dismiss()
                    }
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

            interactionMomentsToggle
        }
    }

    private var interactionMomentsToggle: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Toggle(isOn: $generateInteractionMoments) {
                    Label(
                        localization.t("byoc.interactionMoments"),
                        systemImage: "wand.and.stars"
                    )
                    .foregroundStyle(DesignTokens.Text.primary)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                }
                .tint(DesignTokens.Primary.default)
                Text(localization.t("byoc.interactionMomentsDescription"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.md)
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
        guard deviceCode == nil else { return }

        let authService = YouTubeAuthService(
            clientId: clientId,
            clientSecret: clientSecret
        )
        do {
            let code = try await authService.requestDeviceCode()
            deviceCode = code
            startPolling(authService: authService, code: code)
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
            logger.error("YouTube code request failed", error: error)
        }
    }

    private func startPolling(
        authService: YouTubeAuthService,
        code: GoogleDeviceCode
    ) {
        pollTask?.cancel()
        pollTask = Task {
            isPolling = true
            defer { isPolling = false }

            do {
                let tokens = try await authService.pollForToken(
                    deviceCode: code
                )
                try Task.checkCancellation()
                try await byocManager.addYouTubeSource(
                    name: "YouTube",
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                )
                isSuccess = true
            } catch is CancellationError {
                return
            } catch {
                self.error = error.localizedDescription
                logger.error("YouTube auth failed", error: error)
            }
        }
    }
}
