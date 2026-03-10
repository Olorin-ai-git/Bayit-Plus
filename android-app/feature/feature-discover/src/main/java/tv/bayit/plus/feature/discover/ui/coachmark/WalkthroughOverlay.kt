package tv.bayit.plus.feature.discover.ui.coachmark

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.platform.LocalContext
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.feature.discover.walkthrough.WalkthroughSessionManager

@Composable
fun WalkthroughOverlay(
    featureIds: Set<String>,
    sessionManager: WalkthroughSessionManager,
    targetRegistry: WalkthroughTargetRegistry,
    isReady: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val activeSession by sessionManager.activeSession.collectAsState()
    val context = LocalContext.current

    val session = activeSession ?: return
    if (session.featureId !in featureIds) return

    val stateMachine = sessionManager.currentStateMachine() ?: return
    val stepIndex by stateMachine.currentStepIndex.collectAsState()
    val isActive by stateMachine.isActive.collectAsState()

    if (!isActive || !isReady) return

    DisposableEffect(session.featureId) {
        onDispose { sessionManager.end() }
    }

    val fallbackRect = Rect(0f, 0f, 1f, 1f)

    val steps = stateMachine.feature.walkthroughSteps.map { step ->
        CoachMarkStep(
            instructionText = bayitString(step.instructionKey),
            targetRect = targetRegistry[step.targetAccessibilityId] ?: fallbackRect,
        )
    }

    CoachMarkOverlay(
        steps = steps,
        currentStepIndex = stepIndex,
        onNext = { stateMachine.advance() },
        onSkip = { sessionManager.end() },
        onDone = {
            stateMachine.complete(context)
            sessionManager.end()
        },
        modifier = modifier,
    )
}
