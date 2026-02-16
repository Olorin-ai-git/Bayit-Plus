package tv.bayit.plus.core.network

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Application-scoped event bus for session expiry.
 *
 * When the [TokenAuthenticator][tv.bayit.plus.core.network.authenticator.TokenAuthenticator]
 * exhausts retry attempts on a 401 response, it emits to [sessionExpired].
 * The UI layer (MainActivity) collects this flow and triggers sign-out,
 * which navigates the user back to the login screen.
 *
 * Uses a singleton object to avoid circular Hilt dependency between
 * core-network and core-auth modules.
 */
object SessionEventBus {
    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired: SharedFlow<Unit> = _sessionExpired.asSharedFlow()

    fun notifySessionExpired() {
        _sessionExpired.tryEmit(Unit)
    }
}
