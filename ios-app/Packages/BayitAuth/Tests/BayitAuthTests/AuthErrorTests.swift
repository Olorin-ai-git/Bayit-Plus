import XCTest
@testable import BayitAuth

final class AuthErrorTests: XCTestCase {

    // MARK: - User Facing Messages

    func testNotAuthenticatedUserFacingMessage() {
        let error = AuthError.notAuthenticated
        XCTAssertEqual(error.userFacingMessage, "Please sign in to continue")
    }

    func testTokenRefreshFailedUserFacingMessage() {
        let error = AuthError.tokenRefreshFailed(underlying: "Network error")
        XCTAssertEqual(error.userFacingMessage, "Session expired. Please sign in again.")
    }

    func testGoogleSignInFailedUserFacingMessage() {
        let error = AuthError.googleSignInFailed(underlying: "User cancelled")
        XCTAssertEqual(error.userFacingMessage, "Google sign-in failed. Please try again.")
    }

    func testAppleSignInFailedUserFacingMessage() {
        let error = AuthError.appleSignInFailed(underlying: "User cancelled")
        XCTAssertEqual(error.userFacingMessage, "Apple sign-in failed. Please try again.")
    }

    func testEmailSignInFailedUserFacingMessage() {
        let error = AuthError.emailSignInFailed(underlying: "Invalid credentials")
        XCTAssertEqual(error.userFacingMessage, "Invalid email or password")
    }

    func testKeychainErrorsUserFacingMessage() {
        let saveError = AuthError.keychainSaveFailed(status: -25300)
        XCTAssertEqual(saveError.userFacingMessage, "An unexpected error occurred")

        let loadError = AuthError.keychainLoadFailed(status: -25300)
        XCTAssertEqual(loadError.userFacingMessage, "An unexpected error occurred")

        let deleteError = AuthError.keychainDeleteFailed(status: -25300)
        XCTAssertEqual(deleteError.userFacingMessage, "An unexpected error occurred")

        let notFoundError = AuthError.keychainItemNotFound
        XCTAssertEqual(notFoundError.userFacingMessage, "An unexpected error occurred")
    }

    func testProfileErrorsUserFacingMessages() {
        let selectionError = AuthError.profileSelectionFailed(underlying: "Profile locked")
        XCTAssertEqual(selectionError.userFacingMessage, "Could not select profile. Please try again.")

        let loadError = AuthError.profileLoadFailed(underlying: "Network error")
        XCTAssertEqual(loadError.userFacingMessage, "Could not load profiles. Please try again.")

        let createError = AuthError.profileCreateFailed(underlying: "Invalid data")
        XCTAssertEqual(createError.userFacingMessage, "Could not create profile. Please try again.")
    }

    func testBetaCreditsFetchFailedUserFacingMessage() {
        let error = AuthError.betaCreditsFetchFailed(underlying: "API error")
        XCTAssertEqual(error.userFacingMessage, "Could not load beta credits")
    }

    func testInvalidFirebaseUserUserFacingMessage() {
        let error = AuthError.invalidFirebaseUser
        XCTAssertEqual(error.userFacingMessage, "Authentication error. Please sign in again.")
    }

    func testMissingIDTokenUserFacingMessage() {
        let error = AuthError.missingIDToken
        XCTAssertEqual(error.userFacingMessage, "Authentication error. Please sign in again.")
    }

    func testSignOutFailedUserFacingMessage() {
        let error = AuthError.signOutFailed(underlying: "Network error")
        XCTAssertEqual(error.userFacingMessage, "Could not sign out. Please try again.")
    }

    func testCancelledUserFacingMessage() {
        let error = AuthError.cancelled
        XCTAssertEqual(error.userFacingMessage, "Sign-in was cancelled")
    }

    // MARK: - Error Descriptions

    func testNotAuthenticatedDescription() {
        let error = AuthError.notAuthenticated
        XCTAssertEqual(error.errorDescription, "User is not authenticated")
    }

    func testTokenRefreshFailedDescription() {
        let error = AuthError.tokenRefreshFailed(underlying: "Network timeout")
        XCTAssertEqual(error.errorDescription, "Token refresh failed: Network timeout")
    }

    func testGoogleSignInFailedDescription() {
        let error = AuthError.googleSignInFailed(underlying: "Invalid client ID")
        XCTAssertEqual(error.errorDescription, "Google sign-in failed: Invalid client ID")
    }

    func testAppleSignInFailedDescription() {
        let error = AuthError.appleSignInFailed(underlying: "User cancelled")
        XCTAssertEqual(error.errorDescription, "Apple sign-in failed: User cancelled")
    }

    func testEmailSignInFailedDescription() {
        let error = AuthError.emailSignInFailed(underlying: "Wrong password")
        XCTAssertEqual(error.errorDescription, "Email sign-in failed: Wrong password")
    }

    func testKeychainErrorsDescriptions() {
        let saveError = AuthError.keychainSaveFailed(status: -25300)
        XCTAssertEqual(saveError.errorDescription, "Keychain save failed with status: -25300")

        let loadError = AuthError.keychainLoadFailed(status: -25299)
        XCTAssertEqual(loadError.errorDescription, "Keychain load failed with status: -25299")

        let deleteError = AuthError.keychainDeleteFailed(status: -25298)
        XCTAssertEqual(deleteError.errorDescription, "Keychain delete failed with status: -25298")

        let notFoundError = AuthError.keychainItemNotFound
        XCTAssertEqual(notFoundError.errorDescription, "Keychain item not found")
    }

    func testProfileErrorsDescriptions() {
        let selectionError = AuthError.profileSelectionFailed(underlying: "PIN required")
        XCTAssertEqual(selectionError.errorDescription, "Profile selection failed: PIN required")

        let loadError = AuthError.profileLoadFailed(underlying: "API timeout")
        XCTAssertEqual(loadError.errorDescription, "Profile load failed: API timeout")

        let createError = AuthError.profileCreateFailed(underlying: "Name taken")
        XCTAssertEqual(createError.errorDescription, "Profile creation failed: Name taken")
    }

    func testBetaCreditsFetchFailedDescription() {
        let error = AuthError.betaCreditsFetchFailed(underlying: "Server error")
        XCTAssertEqual(error.errorDescription, "Beta credits fetch failed: Server error")
    }

    func testInvalidFirebaseUserDescription() {
        let error = AuthError.invalidFirebaseUser
        XCTAssertEqual(error.errorDescription, "Firebase user is invalid or missing")
    }

    func testMissingIDTokenDescription() {
        let error = AuthError.missingIDToken
        XCTAssertEqual(error.errorDescription, "Firebase ID token is missing")
    }

    func testSignOutFailedDescription() {
        let error = AuthError.signOutFailed(underlying: "Token invalidation failed")
        XCTAssertEqual(error.errorDescription, "Sign-out failed: Token invalidation failed")
    }

    func testCancelledDescription() {
        let error = AuthError.cancelled
        XCTAssertEqual(error.errorDescription, "Authentication was cancelled")
    }

    // MARK: - Sendable Conformance

    func testAuthErrorIsSendable() {
        let error = AuthError.notAuthenticated

        Task {
            let capturedError = error
            XCTAssertEqual(capturedError.errorDescription, "User is not authenticated")
        }
    }
}
