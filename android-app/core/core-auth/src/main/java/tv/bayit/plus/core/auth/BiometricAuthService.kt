package tv.bayit.plus.core.auth

import android.app.KeyguardManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import java.security.SecureRandom
import java.util.concurrent.Executor
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.math.min

/**
 * Biometric authentication for Bayit+ Android (API 28+).
 * Fingerprint, face, iris with device-credential fallback.
 * Session tokens, lockout with exponential backoff, observable state.
 */
@Singleton
class BiometricAuthService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) {
    private val _state = MutableStateFlow<BiometricAuthState>(BiometricAuthState.Idle)
    val biometricAuthState: StateFlow<BiometricAuthState> = _state.asStateFlow()

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun checkCapability(): BiometricCapability {
        val mgr = BiometricManager.from(context)
        val strong = mgr.canAuthenticate(Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
        val weak = mgr.canAuthenticate(Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS
        val secure = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardSecure
        return BiometricCapability(
            canAuthenticate = strong || weak || secure,
            deviceSecure = secure,
            hasStrongBiometric = strong,
            hasWeakBiometric = weak,
            availableTypes = buildList {
                if (strong) add(BiometricType.BIOMETRIC_STRONG)
                if (weak) add(BiometricType.BIOMETRIC_WEAK)
                if (secure) add(BiometricType.DEVICE_CREDENTIAL)
            },
        )
    }

    /** Shows biometric prompt, suspends until resolution. Requires Activity context. */
    suspend fun authenticate(
        activity: FragmentActivity, title: String, subtitle: String,
    ): BayitResult<Unit> {
        val canAuth = BiometricManager.from(context)
            .canAuthenticate(Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
        if (!canAuth) return BayitResult.failure(
            BayitError.Authentication(stringProvider.string("biometric.unsupported")),
        )
        val lockout = getLockoutStatus()
        if (lockout.isLocked) return BayitResult.failure(
            BayitError.Authentication(
                stringProvider.string(
                    "biometric.lockedOut",
                    mapOf("ms" to lockout.timeRemainingMs.toString()),
                ),
            ),
        )
        _state.value = BiometricAuthState.Authenticating
        val executor = Executor { task -> Handler(Looper.getMainLooper()).post(task) }
        return suspendCancellableCoroutine { cont ->
            val prompt = BiometricPrompt(activity, executor, createCallback(cont))
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title).setSubtitle(subtitle)
                .setAllowedAuthenticators(Authenticators.BIOMETRIC_STRONG or Authenticators.DEVICE_CREDENTIAL)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) info.setNegativeButtonText(stringProvider.string("common.cancel"))
            prompt.authenticate(info.build())
            cont.invokeOnCancellation { prompt.cancelAuthentication() }
        }
    }

    fun isSessionValid(): Boolean {
        val token = prefs.getString(KEY_TOKEN, null) ?: return false
        return token.isNotEmpty() && System.currentTimeMillis() < prefs.getLong(KEY_EXPIRES, 0)
    }

    fun shouldRefreshToken(): Boolean {
        val secs = (prefs.getLong(KEY_EXPIRES, 0) - System.currentTimeMillis()) / MS_PER_SEC
        return secs in 1..REFRESH_BEFORE_SEC
    }

    fun getTimeUntilExpiration(): Long {
        val secs = (prefs.getLong(KEY_EXPIRES, 0) - System.currentTimeMillis()) / MS_PER_SEC
        return if (secs > 0) secs else 0
    }

    fun isBiometricSignInEnabled(): Boolean = prefs.getBoolean(KEY_SIGNIN_ENROLLED, false)

    fun enableBiometricSignIn() {
        prefs.edit().putBoolean(KEY_SIGNIN_ENROLLED, true).apply()
        logger.info("Biometric sign-in enabled")
    }

    fun disableBiometricSignIn() {
        prefs.edit().putBoolean(KEY_SIGNIN_ENROLLED, false).apply()
        logger.info("Biometric sign-in disabled")
    }

    fun logout() {
        prefs.edit().clear().apply()
        _state.value = BiometricAuthState.Idle
        logger.info("Biometric session cleared on logout")
    }

    private fun createCallback(
        cont: CancellableContinuation<BayitResult<Unit>>,
    ) = object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            val auth = when (result.authenticationType) {
                BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL -> "device_credential"
                BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC -> "biometric"
                else -> "unknown"
            }
            clearFailedAttempts()
            val session = generateSessionToken(auth)
            _state.value = BiometricAuthState.Authenticated(session)
            logger.info("Biometric auth succeeded", mapOf("authenticator" to auth))
            cont.resume(BayitResult.success(Unit))
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            val msg = mapBiometricErrorMessage(errorCode, errString, stringProvider)
            _state.value = BiometricAuthState.Error(msg)
            logger.warning("Biometric auth error", mapOf("errorCode" to errorCode.toString()))
            cont.resume(BayitResult.failure(BayitError.Authentication(msg)))
        }

        override fun onAuthenticationFailed() {
            recordFailedAttempt()
            val status = getLockoutStatus()
            val msg = if (status.isLocked)
                stringProvider.string("biometric.lockedOut", mapOf("ms" to status.timeRemainingMs.toString()))
            else
                stringProvider.string("biometric.authFailed")
            _state.value = BiometricAuthState.Failed(msg, status)
            logger.warning("Biometric auth failed", mapOf("isLocked" to status.isLocked.toString()))
            cont.resume(BayitResult.failure(BayitError.Authentication(msg)))
        }
    }

    private fun generateSessionToken(authenticator: String): SessionToken {
        val now = System.currentTimeMillis()
        val expiresAt = now + (TOKEN_EXPIRY_SEC * MS_PER_SEC)
        val bytes = ByteArray(TOKEN_BYTES).also { SecureRandom().nextBytes(it) }
        val token = Base64.encodeToString(bytes, Base64.NO_WRAP)
        prefs.edit()
            .putString(KEY_TOKEN, token).putLong(KEY_EXPIRES, expiresAt)
            .putLong(KEY_LAST_AUTH, now).putInt(KEY_ATTEMPTS, 0).putLong(KEY_LOCKOUT, 0)
            .apply()
        return SessionToken(token, expiresAt, authenticator)
    }

    private fun recordFailedAttempt() {
        val attempts = prefs.getInt(KEY_ATTEMPTS, 0) + 1
        val lockoutMs = min(LOCKOUT_INC_MS * (1 shl (attempts - 1)), MAX_LOCKOUT_MS)
        prefs.edit().putInt(KEY_ATTEMPTS, attempts).putLong(KEY_LOCKOUT, System.currentTimeMillis() + lockoutMs).apply()
        logger.warning("Biometric failed attempt", mapOf("attempts" to attempts.toString()))
    }

    private fun clearFailedAttempts() {
        prefs.edit().putInt(KEY_ATTEMPTS, 0).putLong(KEY_LOCKOUT, 0).apply()
    }

    private fun getLockoutStatus(): LockoutStatus {
        val until = prefs.getLong(KEY_LOCKOUT, 0)
        val now = System.currentTimeMillis()
        return if (now < until) LockoutStatus(true, until - now) else LockoutStatus(false, 0)
    }

    companion object {
        private const val PREF_NAME = "bayit_biometric_sessions"
        private const val KEY_SIGNIN_ENROLLED = "biometric_signin_enrolled"
        private const val KEY_TOKEN = "session_token"
        private const val KEY_EXPIRES = "token_expires_at"
        private const val KEY_ATTEMPTS = "failed_attempts"
        private const val KEY_LOCKOUT = "lockout_until"
        private const val KEY_LAST_AUTH = "last_auth_time"
        private const val TOKEN_EXPIRY_SEC = 3600L
        private const val REFRESH_BEFORE_SEC = 300L
        private const val LOCKOUT_INC_MS = 1000L
        private const val MAX_LOCKOUT_MS = 60000L
        private const val TOKEN_BYTES = 32
        private const val MS_PER_SEC = 1000L
    }
}
