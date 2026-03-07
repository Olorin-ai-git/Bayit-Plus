#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Sheet that guides the user through Plex PIN-based auth on tvOS.
    struct TVPlexAuthSheet: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        let onAuthenticated: (String) -> Void
        let onDismiss: () -> Void

        @State private var pinCode: String?
        @State private var isLoading = true
        @State private var errorMessage: String?
        @State private var pollTask: Task<Void, Never>?

        var body: some View {
            ZStack {
                DesignTokens.Glass.bg.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    if let error = errorMessage {
                        errorView(error)
                    } else if let code = pinCode {
                        pinDisplaySection(code)
                    } else if isLoading {
                        loadingSection
                    }
                    cancelButton
                }
                .padding(TVDesignTokens.Spacing.xxxxl)
            }
            .task { await requestPIN() }
            .onDisappear { pollTask?.cancel() }
        }

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "server.rack")
                    .font(.system(size: 60))
                    .foregroundStyle(.orange)

                Text(localization.t("byoc.addPlex"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }

        private func pinDisplaySection(_ code: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("byoc.plexVisitLink"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text("plex.tv/link")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("byoc.plexEnterCode"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(Array(code), id: \.self) { char in
                        Text(String(char))
                            .font(.system(size: 64, weight: .bold, design: .monospaced))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .frame(width: 80, height: 100)
                            .background(DesignTokens.Background.elevated)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                    }
                }

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    ProgressView().scaleEffect(0.7)
                    Text(localization.t("byoc.plexWaiting"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }

        private var loadingSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ProgressView()
                Text(localization.t("byoc.plexRequestingPin"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(DesignTokens.ErrorColor.default)

                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .multilineTextAlignment(.center)

                Button {
                    errorMessage = nil
                    Task { await requestPIN() }
                } label: {
                    Text(localization.t("common.retry"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .frame(width: 200)
                        .background(DesignTokens.Primary.p400)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
            }
        }

        private var cancelButton: some View {
            Button { onDismiss() } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(width: 200)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        private func requestPIN() async {
            isLoading = true
            let authService = PlexAuthService(
                clientId: byocManager.plexClientId,
                productName: "Bayit+"
            )
            do {
                let pin = try await authService.requestPIN()
                pinCode = pin.code
                isLoading = false
                pollTask = Task {
                    do {
                        let token = try await authService.pollForToken(pinId: pin.id)
                        await MainActor.run { onAuthenticated(token) }
                    } catch {
                        await MainActor.run {
                            errorMessage = error.localizedDescription
                        }
                    }
                }
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

#endif
