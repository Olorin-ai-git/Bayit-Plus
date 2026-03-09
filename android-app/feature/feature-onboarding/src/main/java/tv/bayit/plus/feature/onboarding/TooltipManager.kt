package tv.bayit.plus.feature.onboarding

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

private const val DATASTORE_NAME = "bayit_onboarding_tooltips"
private const val KEY_PREFIX = "bayit.onboarding.tooltips."
private const val TIPS_DISABLED_KEY = "${KEY_PREFIX}all_disabled"

private val Context.onboardingDataStore: DataStore<Preferences>
    by preferencesDataStore(name = DATASTORE_NAME)

@Singleton
class TooltipManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {

    private val dataStore: DataStore<Preferences>
        get() = context.onboardingDataStore

    private val _tipsDisabled = MutableStateFlow(false)
    val tipsDisabled: StateFlow<Boolean> = _tipsDisabled.asStateFlow()

    suspend fun shouldShow(featureKey: String): Boolean {
        val prefs = dataStore.data.first()
        val disabledKey = booleanPreferencesKey(TIPS_DISABLED_KEY)
        if (prefs[disabledKey] == true) {
            return false
        }
        val shownKey = booleanPreferencesKey("$KEY_PREFIX$featureKey")
        return prefs[shownKey] != true
    }

    suspend fun markShown(featureKey: String) {
        logger.debug(
            "Marking tooltip shown",
            mapOf("featureKey" to featureKey),
        )
        val shownKey = booleanPreferencesKey("$KEY_PREFIX$featureKey")
        dataStore.edit { prefs ->
            prefs[shownKey] = true
        }
    }

    suspend fun resetAll() {
        logger.info("Resetting all tooltip states")
        dataStore.edit { prefs ->
            val tooltipKeys = prefs.asMap().keys.filter { key ->
                key.name.startsWith(KEY_PREFIX) && key.name != TIPS_DISABLED_KEY
            }
            tooltipKeys.forEach { key ->
                prefs.remove(key)
            }
        }
    }

    suspend fun setTipsDisabled(disabled: Boolean) {
        logger.info(
            "Setting tips disabled state",
            mapOf("disabled" to disabled.toString()),
        )
        val disabledKey = booleanPreferencesKey(TIPS_DISABLED_KEY)
        dataStore.edit { prefs ->
            prefs[disabledKey] = disabled
        }
        _tipsDisabled.value = disabled
    }

    suspend fun syncDisabledState() {
        val prefs = dataStore.data.first()
        val disabledKey = booleanPreferencesKey(TIPS_DISABLED_KEY)
        _tipsDisabled.value = prefs[disabledKey] == true
    }
}
