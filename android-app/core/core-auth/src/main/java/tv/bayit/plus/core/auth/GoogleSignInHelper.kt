package tv.bayit.plus.core.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import java.security.MessageDigest
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Helper for Google Sign-In using modern Credential Manager API.
 * Replaces the deprecated GoogleSignInClient.
 */
@Singleton
class GoogleSignInHelper @Inject constructor(
    private val logger: BayitLogger
) {
    /**
     * Initiates Google Sign-In flow and returns the ID token on success.
     *
     * @param context Activity context required for Credential Manager
     * @param googleClientId Google OAuth 2.0 Client ID from config
     * @return BayitResult with ID token string on success, error on failure
     */
    suspend fun signIn(context: Context, googleClientId: String): BayitResult<String> {
        return try {
            if (googleClientId.isBlank()) {
                logger.error(
                    "Google Client ID not configured",
                    metadata = mapOf("config" to "GOOGLE_CLIENT_ID")
                )
                return BayitResult.failure(
                    BayitError.Configuration("Google Client ID not configured")
                )
            }

            val credentialManager = CredentialManager.create(context)

            val rawNonce = UUID.randomUUID().toString()
            val hashedNonce = hashNonce(rawNonce)

            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(googleClientId)
                .setNonce(hashedNonce)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val result = credentialManager.getCredential(
                request = request,
                context = context,
            )

            when (val credential = result.credential) {
                is GoogleIdTokenCredential -> {
                    logger.info(
                        "Google Sign-In credential received",
                        mapOf("id" to credential.id)
                    )
                    BayitResult.success(credential.idToken)
                }
                else -> {
                    logger.error(
                        "Unexpected credential type",
                        metadata = mapOf("type" to credential::class.simpleName.orEmpty())
                    )
                    BayitResult.failure(
                        BayitError.Authentication("Unexpected credential type received")
                    )
                }
            }
        } catch (e: GetCredentialCancellationException) {
            logger.info("Google Sign-In cancelled by user")
            BayitResult.failure(
                BayitError.Cancelled("Google Sign-In cancelled by user", e)
            )
        } catch (e: NoCredentialException) {
            logger.warning(
                "No Google credentials available",
                metadata = mapOf("error" to e.message.orEmpty())
            )
            BayitResult.failure(
                BayitError.Authentication("No Google account found on device", e)
            )
        } catch (e: GetCredentialException) {
            logger.error(
                "Google Sign-In credential retrieval failed",
                error = e,
                metadata = mapOf("type" to e::class.simpleName.orEmpty())
            )
            BayitResult.failure(
                BayitError.Authentication("Google Sign-In failed: ${e.message}", e)
            )
        } catch (e: Exception) {
            logger.error("Google Sign-In unexpected error", error = e)
            BayitResult.failure(
                BayitError.Unknown("Unexpected error during Google Sign-In", e)
            )
        }
    }

    /**
     * Hashes the nonce using SHA-256 for security.
     */
    private fun hashNonce(nonce: String): String {
        val bytes = nonce.toByteArray()
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.fold("") { str, byte -> str + "%02x".format(byte) }
    }
}
