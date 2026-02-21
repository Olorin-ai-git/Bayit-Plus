import Foundation

protocol AvatarRepository: Sendable {
    func createCreatifyPersona(
        avatarId: String,
        profileId: String,
        pin: String
    ) async throws -> CreatifyAvatarStatus

    func fetchAvatarStatus(
        avatarId: String
    ) async throws -> CreatifyAvatarStatus

    func grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String
    ) async throws -> [String: Any]

    func checkBiometricConsent(
        profileId: String
    ) async throws -> BiometricConsentStatus

    func revokeBiometricConsent(
        profileId: String,
        consentType: String
    ) async throws -> Bool

    func getMagicMirrorGreeting(
        profileId: String
    ) async throws -> MagicMirrorGreeting

    // MARK: - VOD Interactions

    func fetchInteractiveMoments(
        contentId: String
    ) async throws -> [InteractiveMoment]

    func fetchInteractiveCharacters(
        contentId: String
    ) async throws -> [ContentCharacter]

    func startInteractionSession(
        profileId: String,
        avatarId: String,
        contentId: String,
        timestamp: Double
    ) async throws -> VODSessionResponse

    func startFreeInteractionSession(
        profileId: String,
        avatarId: String,
        contentId: String,
        characterName: String,
        currentTimestamp: Double
    ) async throws -> VODSessionResponse

    func sendInteractionMessage(
        sessionId: String,
        message: String
    ) async throws -> CharacterResponsePayload

    func completeInteractionSession(
        sessionId: String
    ) async throws -> SessionStatusPayload

    // MARK: - Multi-Character Interaction (Phase 3)

    func sendMultiCharacterMessage(
        sessionId: String,
        message: String,
        addressedCharacter: String
    ) async throws -> MultiCharacterResponse

    // MARK: - Pause & Ask

    func sendPauseAskMessage(
        sessionId: String,
        message: String,
        languageHint: String
    ) async throws -> PauseAskResponse

    // MARK: - Shared Interaction (Phase 3)

    func startSharedInteraction(
        partyId: String,
        contentId: String,
        momentTimestamp: Double,
        characterName: String,
        profileId: String,
        avatarId: String,
        displayName: String
    ) async throws -> VODSessionResponse

    func sendSharedMessage(
        partyId: String,
        sessionId: String,
        message: String,
        addressedCharacter: String?
    ) async throws -> MultiCharacterResponse

    func endSharedInteraction(
        partyId: String,
        sessionId: String
    ) async throws -> SessionStatusPayload

    func getSharedInteractionState(
        partyId: String,
        sessionId: String
    ) async throws -> SharedSessionState
}
