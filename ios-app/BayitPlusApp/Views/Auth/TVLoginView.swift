import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// View displayed when user scans a TV login QR code.
/// Handles the device pairing authentication flow.
struct TVLoginView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos

    let sessionId: String
    let token: String
    let expires: String

    @State private var status: PairingStatus = .idle
    @State private var errorMessage: String?
    @State private var isVerifying = false

    private let logger = BayitLogger(category: "TVLogin")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerSection

                statusContent

                Spacer()
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .navigationTitle(localization.t("tvLogin.title"))
        .task {
            await verifyAndConnect()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Primary.p400)
                .symbolEffect(.bounce, value: status)

            Text(localization.t("tvLogin.header"))
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("tvLogin.subtitle"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Status Content

    @ViewBuilder
    private var statusContent: some View {
        switch status {
        case .idle, .loading:
            loadingSection

        case .waitingForScan:
            EmptyView()

        case .companionConnected:
            connectedSection

        case .authenticating:
            authenticatingSection

        case .authenticated:
            successSection

        case .failed:
            errorSection

        case .expired:
            expiredSection
        }
    }

    private var loadingSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)
                .scaleEffect(1.2)

            Text(localization.t("tvLogin.verifying"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    private var connectedSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.success)
                .symbolEffect(.pulse)

            Text(localization.t("tvLogin.connected"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            if authManager.isAuthenticated {
                GlassButton(
                    localization.t("tvLogin.signInToTV"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "arrow.right")
                ) {
                    Task { await completeAuthentication() }
                }
                .frame(maxWidth: .infinity)
            } else {
                Text(localization.t("tvLogin.pleaseSignIn"))
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Text.secondary)

                GlassButton(
                    localization.t("tvLogin.signInButton"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "arrow.right")
                ) {
                    coordinator.showingAuth = true
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }

    private var authenticatingSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)
                .scaleEffect(1.5)

            Text(localization.t("tvLogin.authenticating"))
                .font(.title3)
                .fontWeight(.medium)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.almostThere"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    private var successSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            if #available(iOS 18.0, *) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Colors.Semantic.success)
                    .symbolEffect(.bounce)
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Colors.Semantic.success)
            }

            Text(localization.t("tvLogin.success"))
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.tvSignedIn"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("common.done"),
                variant: .primary,
                size: .large
            ) {
                coordinator.dismissTVLogin()
                coordinator.navigate(to: .home)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, DesignTokens.Spacing.md)
        }
        .padding(DesignTokens.Spacing.xl)
    }

    private var errorSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)

            Text(localization.t("tvLogin.error"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }

            GlassButton(
                localization.t("common.tryAgain"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "arrow.clockwise")
            ) {
                Task { await verifyAndConnect() }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }

    private var expiredSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Semantic.warning)

            Text(localization.t("tvLogin.expired"))
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.expiredMessage"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("tvLogin.goToHome"),
                variant: .primary,
                size: .large
            ) {
                coordinator.dismissTVLogin()
                coordinator.navigate(to: .home)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgLight)
        )
    }

    // MARK: - API Methods

    private func verifyAndConnect() async {
        status = .loading
        errorMessage = nil

        do {
            let config = AppConfiguration()
            let verified = try await verifySession(config: config)

            guard verified else {
                status = .failed
                errorMessage = "Invalid or expired session"
                return
            }

            status = .companionConnected
            try await notifyConnection(config: config)

            if authManager.isAuthenticated {
                await completeAuthentication()
            }

        } catch {
            logger.error("TV login verification failed", error: error)
            status = .failed
            errorMessage = error.localizedDescription
        }
    }

    private func verifySession(config: AppConfiguration) async throws -> Bool {
        let url = config.apiBaseURL
            .appendingPathComponent("auth/device-pairing/verify")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = config.apiTimeout

        let body = [
            "session_id": sessionId,
            "token": token
        ]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            return false
        }

        let result = try JSONDecoder().decode(
            VerifySessionResponse.self,
            from: data
        )

        return result.valid
    }

    private func notifyConnection(config: AppConfiguration) async throws {
        let url = config.apiBaseURL
            .appendingPathComponent("auth/device-pairing/companion-connect")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = config.apiTimeout

        let deviceType: String
        #if os(iOS)
        deviceType = "ios"
        #elseif os(tvOS)
        deviceType = "tvos"
        #else
        deviceType = "unknown"
        #endif

        let body: [String: String] = [
            "session_id": sessionId,
            "device_type": deviceType
        ]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.devicePairingFailed(underlying: "Failed to notify connection")
        }
    }

    private func completeAuthentication() async {
        guard authManager.isAuthenticated else {
            return
        }

        status = .authenticating

        do {
            let config = AppConfiguration()
            let url = config.apiBaseURL
                .appendingPathComponent("auth/device-pairing/v2/complete-token")

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = config.apiTimeout

            if let token = try await authManager.authTokenProvider.currentToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            let body = ["session_id": sessionId]
            request.httpBody = try JSONEncoder().encode(body)

            let (_, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw AuthError.devicePairingFailed(underlying: "Authentication failed")
            }

            status = .authenticated

        } catch {
            logger.error("TV login completion failed", error: error)
            status = .failed
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Response Models

private struct VerifySessionResponse: Decodable {
    let valid: Bool
    let sessionId: String
    let status: String
    let expiresAt: String

    private enum CodingKeys: String, CodingKey {
        case valid
        case sessionId = "session_id"
        case status
        case expiresAt = "expires_at"
    }
}

// MARK: - Status Enum

private enum PairingStatus {
    case idle
    case loading
    case waitingForScan
    case companionConnected
    case authenticating
    case authenticated
    case failed
    case expired
}
