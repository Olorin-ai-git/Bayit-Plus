package tv.bayit.plus.core.auth

import android.content.Context
import android.content.Intent
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
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
 * Helper for Google Sign-In using modern Credential Manager API
 * with legacy GoogleSignInClient fallback for environments where
 * Credential Manager is unavailable (e.g. emulators without screen lock).
 */
@Singleton
class GoogleSignInHelper @Inject constructor(
    private val logger: BayitLogger
) {
    /**
     * Initiates Google Sign-In via Credential Manager.
     * Returns success with ID token, or failure.
     * On failure, caller should attempt [createLegacySignInIntent] as fallback.
     */
    suspend fun signIn(context: Context, googleClientId: String): BayitResult<String> {
        return try {
            logger.info("Google Sign-In initiated", mapOf("clientId" to googleClientId))

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

            logger.info("Requesting Google credential via Credential Manager")
            val result = credentialManager.getCredential(
                request = request,
                context = context,
            )

            val credential = result.credential
            if (credential is GoogleIdTokenCredential) {
                logger.info(
                    "Google Sign-In credential received",
                    mapOf("id" to credential.id)
                )
                BayitResult.success(credential.idToken)
            } else {
                logger.error(
                    "Unexpected credential type",
                    metadata = mapOf("type" to credential::class.simpleName.orEmpty())
                )
                BayitResult.failure(
                    BayitError.Authentication("Unexpected credential type received")
                )
            }
        } catch (e: GetCredentialCancellationException) {
            logger.info("Google Sign-In cancelled by user")
            BayitResult.failure(BayitError.Cancelled("Google Sign-In cancelled by user", e))
        } catch (e: NoCredentialException) {
            logger.warning(
                "Credential Manager unavailable, legacy fallback needed",
                metadata = mapOf("error" to e.message.orEmpty())
            )
            BayitResult.failure(
                BayitError.Authentication("Credential Manager unavailable", e)
            )
        } catch (e: GetCredentialException) {
            logger.warning(
                "Credential Manager failed, legacy fallback needed",
                metadata = mapOf(
                    "type" to e::class.simpleName.orEmpty(),
                    "message" to e.message.orEmpty()
                )
            )
            BayitResult.failure(
                BayitError.Authentication("Credential Manager failed: ${e.message}", e)
            )
        } catch (e: Exception) {
            logger.error("Google Sign-In unexpected error", error = e)
            BayitResult.failure(
                BayitError.Unknown("Unexpected error during Google Sign-In", e)
            )
        }
    }

    /**
     * Creates a legacy GoogleSignInClient intent for environments where
     * Credential Manager is unavailable.
     */
    fun createLegacySignInIntent(context: Context, googleClientId: String): Intent {
        logger.info("Creating legacy Google Sign-In intent")
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(googleClientId)
            .requestEmail()
            .build()
        val client = GoogleSignIn.getClient(context, gso)
        client.signOut()
        return client.signInIntent
    }

    /**
     * Handles the result from the legacy GoogleSignInClient intent.
     */
    fun handleLegacySignInResult(data: Intent?): BayitResult<String> {
        return try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken != null) {
                logger.info(
                    "Legacy Google Sign-In succeeded",
                    mapOf("email" to account.email.orEmpty())
                )
                BayitResult.success(idToken)
            } else {
                logger.error("Legacy Google Sign-In: no ID token received")
                BayitResult.failure(
                    BayitError.Authentication("No ID token received from Google")
                )
            }
        } catch (e: ApiException) {
            logger.error(
                "Legacy Google Sign-In failed",
                error = e,
                metadata = mapOf("statusCode" to e.statusCode.toString())
            )
            BayitResult.failure(
                BayitError.Authentication("Google Sign-In failed: ${e.message}", e)
            )
        }
    }

    private fun hashNonce(nonce: String): String {
        val bytes = nonce.toByteArray()
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.fold("") { str, byte -> str + "%02x".format(byte) }
    }
}
