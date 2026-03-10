package tv.bayit.plus.feature.discover.ui.coachmark

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned

val LocalWalkthroughTargets = compositionLocalOf { WalkthroughTargetRegistry() }

class WalkthroughTargetRegistry {
    private val _targets = mutableMapOf<String, Rect>()
    val targets: Map<String, Rect> get() = _targets.toMap()

    fun register(id: String, bounds: Rect) {
        _targets[id] = bounds
    }

    fun unregister(id: String) {
        _targets.remove(id)
    }

    operator fun get(id: String): Rect? = _targets[id]
}

@Composable
fun rememberWalkthroughTargetRegistry(): WalkthroughTargetRegistry =
    remember { WalkthroughTargetRegistry() }

fun Modifier.walkthroughTarget(
    id: String,
    registry: WalkthroughTargetRegistry,
): Modifier = this.onGloballyPositioned { coordinates ->
    val bounds = coordinates.boundsInRoot()
    if (bounds.width > 0f && bounds.height > 0f) {
        registry.register(id, bounds)
    }
}
