package tv.bayit.plus.core.cast

import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener

internal class CastSessionDelegate(
    private val onSessionStarted: (CastSession) -> Unit,
    private val onSessionEnded: () -> Unit,
    private val onSessionFailed: (Int) -> Unit,
) : SessionManagerListener<CastSession> {

    override fun onSessionStarting(session: CastSession) {}

    override fun onSessionStarted(session: CastSession, sessionId: String) {
        onSessionStarted(session)
    }

    override fun onSessionStartFailed(session: CastSession, error: Int) {
        onSessionFailed(error)
    }

    override fun onSessionEnding(session: CastSession) {}

    override fun onSessionEnded(session: CastSession, error: Int) {
        onSessionEnded()
    }

    override fun onSessionResuming(session: CastSession, sessionId: String) {}

    override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
        onSessionStarted(session)
    }

    override fun onSessionResumeFailed(session: CastSession, error: Int) {
        onSessionFailed(error)
    }

    override fun onSessionSuspended(session: CastSession, reason: Int) {
        onSessionEnded()
    }
}
