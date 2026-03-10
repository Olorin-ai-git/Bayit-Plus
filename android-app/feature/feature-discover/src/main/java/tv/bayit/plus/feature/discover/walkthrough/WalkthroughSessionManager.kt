package tv.bayit.plus.feature.discover.walkthrough

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalkthroughSessionManager @Inject constructor(
    private val logger: BayitLogger,
) {
    private val _activeSession = MutableStateFlow<WalkthroughSession?>(null)
    val activeSession: StateFlow<WalkthroughSession?> = _activeSession.asStateFlow()

    private var stateMachine: WalkthroughStateMachine? = null

    val isActive: Boolean get() = _activeSession.value != null

    val sessionToken: String? get() = _activeSession.value?.sessionToken

    val currentFeatureId: String? get() = _activeSession.value?.featureId

    fun currentStateMachine(): WalkthroughStateMachine? = stateMachine

    fun start(session: WalkthroughSession) {
        if (_activeSession.value != null) {
            logger.warning(
                "walkthrough_replacing_session",
                mapOf(
                    "previous" to (_activeSession.value?.featureId ?: ""),
                    "new" to session.featureId,
                ),
            )
            end()
        }
        stateMachine = WalkthroughStateMachine(session.feature)
        _activeSession.value = session
        logger.info(
            "walkthrough_session_started",
            mapOf("featureId" to session.featureId, "token" to session.sessionToken),
        )
    }

    fun end() {
        val session = _activeSession.value ?: return
        stateMachine?.skip()
        logger.info(
            "walkthrough_session_ended",
            mapOf("featureId" to session.featureId),
        )
        stateMachine = null
        _activeSession.value = null
    }
}
