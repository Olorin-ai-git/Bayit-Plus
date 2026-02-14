package tv.bayit.plus.core.auth

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.tasks.await
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirebaseAuthService @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val logger: BayitLogger,
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unauthenticated)
    val authState: StateFlow<AuthState> = _authState

    init {
        firebaseAuth.addAuthStateListener { auth ->
            val newState = if (auth.currentUser != null) {
                AuthState.Authenticated(auth.currentUser!!)
            } else {
                AuthState.Unauthenticated
            }
            _authState.value = newState
            logger.debug(
                "Auth state changed",
                mapOf("authenticated" to (newState is AuthState.Authenticated).toString()),
            )
        }
    }

    suspend fun signInWithEmail(
        email: String,
        password: String,
    ): BayitResult<FirebaseUser> {
        return try {
            val result = firebaseAuth
                .signInWithEmailAndPassword(email, password)
                .await()
            result.user?.let {
                logger.info(
                    "Email sign-in succeeded",
                    mapOf("uid" to it.uid),
                )
                BayitResult.success(it)
            } ?: BayitResult.failure(
                BayitError.Authentication("Sign in returned null user"),
            )
        } catch (e: Exception) {
            logger.error(
                "Email sign-in failed",
                error = e,
                metadata = mapOf("email" to email),
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Email sign-in failed",
                    e,
                ),
            )
        }
    }

    suspend fun signUpWithEmail(
        email: String,
        password: String,
    ): BayitResult<FirebaseUser> {
        return try {
            val result = firebaseAuth
                .createUserWithEmailAndPassword(email, password)
                .await()
            result.user?.let {
                logger.info(
                    "Email sign-up succeeded",
                    mapOf("uid" to it.uid),
                )
                BayitResult.success(it)
            } ?: BayitResult.failure(
                BayitError.Authentication("Sign up returned null user"),
            )
        } catch (e: Exception) {
            logger.error(
                "Email sign-up failed",
                error = e,
                metadata = mapOf("email" to email),
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Email sign-up failed",
                    e,
                ),
            )
        }
    }

    suspend fun signInWithGoogle(
        idToken: String,
    ): BayitResult<FirebaseUser> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = firebaseAuth
                .signInWithCredential(credential)
                .await()
            result.user?.let {
                logger.info(
                    "Google sign-in succeeded",
                    mapOf("uid" to it.uid),
                )
                BayitResult.success(it)
            } ?: BayitResult.failure(
                BayitError.Authentication("Google sign-in returned null user"),
            )
        } catch (e: Exception) {
            logger.error(
                "Google sign-in failed",
                error = e,
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Google sign-in failed",
                    e,
                ),
            )
        }
    }

    suspend fun sendPasswordResetEmail(
        email: String,
    ): BayitResult<Unit> {
        return try {
            firebaseAuth.sendPasswordResetEmail(email).await()
            logger.info(
                "Password reset email sent",
                mapOf("email" to email),
            )
            BayitResult.success(Unit)
        } catch (e: Exception) {
            logger.error(
                "Password reset email failed",
                error = e,
                metadata = mapOf("email" to email),
            )
            BayitResult.failure(
                BayitError.Network(
                    e.message ?: "Password reset failed",
                    cause = e,
                ),
            )
        }
    }

    suspend fun getIdToken(
        forceRefresh: Boolean = false,
    ): BayitResult<String> {
        return try {
            val user = firebaseAuth.currentUser
                ?: return BayitResult.failure(
                    BayitError.Authentication("No user signed in"),
                )
            val tokenResult = user.getIdToken(forceRefresh).await()
            tokenResult.token?.let {
                BayitResult.success(it)
            } ?: BayitResult.failure(
                BayitError.Authentication("Token result returned null"),
            )
        } catch (e: Exception) {
            logger.error(
                "ID token fetch failed",
                error = e,
                metadata = mapOf("forceRefresh" to forceRefresh.toString()),
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Token fetch failed",
                    e,
                ),
            )
        }
    }

    fun signOut() {
        firebaseAuth.signOut()
        logger.info("User signed out")
    }

    fun getCurrentUser(): FirebaseUser? = firebaseAuth.currentUser
}

sealed interface AuthState {
    data object Unauthenticated : AuthState
    data class Authenticated(val user: FirebaseUser) : AuthState
}
