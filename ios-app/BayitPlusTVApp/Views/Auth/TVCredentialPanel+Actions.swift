import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVCredentialPanel + Actions

extension TVCredentialPanel {
    var isValidEmail: Bool {
        let pattern = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        return email.range(of: pattern, options: .regularExpression) != nil
    }

    func signInWithEmail() {
        let trimmedEmail = email.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        guard !trimmedEmail.isEmpty, !password.isEmpty else { return }

        guard isValidEmail else {
            errorMessage = AuthError.invalidEmailFormat.userFacingMessage
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.signInWithEmail(
                    email: trimmedEmail,
                    password: password
                )
                onAuthSuccess()
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = AuthError.networkError(
                    underlying: error.localizedDescription
                ).userFacingMessage
            }
            isLoading = false
        }
    }

    func signInWithApple() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.signInWithApple()
                onAuthSuccess()
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = AuthError.networkError(
                    underlying: error.localizedDescription
                ).userFacingMessage
            }
            isLoading = false
        }
    }
}
