#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Google Device Authorization sheet for connecting YouTube account.
    struct TVAddYouTubeSheet: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        let onDismiss: () -> Void

        @State private var deviceCode: GoogleDeviceCode?
        @State private var isLoading = true
        @State private var error: String?
        @State private var pollTask: Task<Void, Never>?

        private var youtubeClientId: String {
            Bundle.main.infoDictionary?["YOUTUBE_CLIENT_ID"] as? String ?? ""
        }

        var body: some View {
            ZStack {
                DesignTokens.Glass.bg.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xxl) {
                    headerView

                    if isLoading {
                        loadingView
                    } else if let code = deviceCode {
                        codeDisplayView(code)
                    } else if let error {
                        errorView(error)
                    }

                    Spacer()
                    dismissButton
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
            .task { await requestCode() }
            .onDisappear { pollTask?.cancel() }
        }

        private var headerView: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "play.rectangle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.red)
                Text(localization.t("byoc.addYouTube"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("byoc.youtubeAudioAINote"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var loadingView: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ProgressView()
                Text(localization.t("byoc.youtubeRequestingCode"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private func codeDisplayView(_ code: GoogleDeviceCode) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Text(localization.t("byoc.youtubeVisitLink"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(code.verificationUrl)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold, design: .monospaced))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("byoc.youtubeEnterCode"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(Array(code.userCode), id: \.self) { char in
                        Text(String(char))
                            .font(.system(size: 64, weight: .bold, design: .monospaced))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .frame(width: 80, height: 100)
                            .background(DesignTokens.Glass.bgMedium)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                    }
                }

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    ProgressView()
                    Text(localization.t("byoc.youtubeWaiting"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(.yellow)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Button(localization.t("common.retry")) { Task { await requestCode() } }
                    .tvCardStyle()
            }
        }

        private var dismissButton: some View {
            Button { onDismiss() } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(DesignTokens.Glass.purpleLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        private func requestCode() async {
            isLoading = true
            error = nil
            pollTask?.cancel()

            let authService = YouTubeAuthService(clientId: youtubeClientId)
            do {
                let code = try await authService.requestDeviceCode()
                deviceCode = code
                isLoading = false
                startPolling(authService: authService, code: code)
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }

        private func startPolling(authService: YouTubeAuthService, code: GoogleDeviceCode) {
            pollTask = Task {
                do {
                    let tokens = try await authService.pollForToken(deviceCode: code)
                    try await byocManager.addYouTubeSource(
                        name: "YouTube", accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken
                    )
                    onDismiss()
                } catch {
                    self.error = error.localizedDescription
                }
            }
        }
    }

#endif
