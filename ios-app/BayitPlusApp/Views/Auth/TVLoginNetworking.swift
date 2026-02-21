import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import Foundation

// MARK: - TVLoginView Networking Extensions

extension TVLoginView {
    func verifyAndConnect() async {
        status = .loading
        errorMessage = nil

        do {
            let verified = try await repos.tvLogin.verifySession(
                sessionId: sessionId,
                token: token
            )

            guard verified else {
                logger.warning("Session verification failed")
                status = .failed
                errorMessage = "Invalid or expired session"
                return
            }

            status = .companionConnected
            try await repos.tvLogin.notifyConnection(sessionId: sessionId)

        } catch {
            logger.error("TV login verification failed", error: error)
            status = .failed
            errorMessage = error.localizedDescription
        }
    }

    func completeAuthentication() async {
        guard authManager.isAuthenticated else {
            logger.warning("User not authenticated, cannot complete TV login")
            status = .failed
            errorMessage = "Please sign in first"
            return
        }

        status = .authenticating

        do {
            try await repos.tvLogin.completeAuthentication(sessionId: sessionId)
            logger.info("TV login completed successfully")
            status = .authenticated
        } catch let error as AuthError {
            logger.error("AuthError during TV login completion", error: error)
            status = .failed
            errorMessage = error.userFacingMessage
        } catch {
            logger.error("Unexpected error during TV login completion", error: error)
            status = .failed
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Status Enum

enum PairingStatus {
    case idle
    case loading
    case waitingForScan
    case companionConnected
    case authenticating
    case authenticated
    case failed
    case expired
}
