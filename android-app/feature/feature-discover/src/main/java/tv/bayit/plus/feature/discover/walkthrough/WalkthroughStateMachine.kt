package tv.bayit.plus.feature.discover.walkthrough

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import tv.bayit.plus.feature.discover.model.DiscoverFeature

class WalkthroughStateMachine(
    val feature: DiscoverFeature,
) {
    private val _currentStepIndex = MutableStateFlow(0)
    val currentStepIndex: StateFlow<Int> = _currentStepIndex.asStateFlow()

    private val _isActive = MutableStateFlow(true)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    val totalSteps: Int get() = feature.walkthroughSteps.size

    fun advance() {
        _currentStepIndex.update { current ->
            if (current < totalSteps - 1) current + 1 else current
        }
    }

    fun skip() {
        _isActive.update { false }
    }

    fun complete(context: Context) {
        _isActive.update { false }
        markCompleted(context, feature.id)
    }

    companion object {
        private const val PREFS_NAME = "discover_walkthrough"
        private const val KEY_PREFIX = "completed_"

        fun hasCompleted(context: Context, featureId: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean("$KEY_PREFIX$featureId", false)
        }

        private fun markCompleted(context: Context, featureId: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean("$KEY_PREFIX$featureId", true).apply()
        }
    }
}
