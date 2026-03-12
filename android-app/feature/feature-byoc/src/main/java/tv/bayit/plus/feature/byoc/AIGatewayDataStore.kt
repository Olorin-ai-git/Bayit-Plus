package tv.bayit.plus.feature.byoc

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private const val DATASTORE_NAME = "bayit_ai_gateway"

private val Context.aiGatewayDataStore: DataStore<Preferences>
    by preferencesDataStore(name = DATASTORE_NAME)

private val KEY_DISMISS_COUNT = intPreferencesKey("dismiss_count")
private val KEY_LAST_DISMISS_SESSION = intPreferencesKey("last_dismiss_session")
private val KEY_PERMANENTLY_DISMISSED = booleanPreferencesKey("permanently_dismissed")
private val KEY_SESSION_COUNT = intPreferencesKey("session_count")
private val KEY_FIRST_BYOC_PLAY = booleanPreferencesKey("first_byoc_play_completed")
private val KEY_FIRST_AI_FEATURE_USED = booleanPreferencesKey("first_ai_feature_used")
private val KEY_MORE_CONTENT_DISMISSED = booleanPreferencesKey("more_content_dismissed")

data class AIGatewayState(
    val dismissCount: Int = 0,
    val lastDismissSession: Int = 0,
    val permanentlyDismissed: Boolean = false,
    val sessionCount: Int = 0,
    val firstBYOCPlayCompleted: Boolean = false,
    val firstAIFeatureUsed: Boolean = false,
    val moreContentDismissed: Boolean = false,
)

@Singleton
class AIGatewayDataStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val dataStore: DataStore<Preferences>
        get() = context.aiGatewayDataStore

    suspend fun load(): AIGatewayState {
        val prefs = dataStore.data.first()
        return AIGatewayState(
            dismissCount = prefs[KEY_DISMISS_COUNT] ?: 0,
            lastDismissSession = prefs[KEY_LAST_DISMISS_SESSION] ?: 0,
            permanentlyDismissed = prefs[KEY_PERMANENTLY_DISMISSED] ?: false,
            sessionCount = prefs[KEY_SESSION_COUNT] ?: 0,
            firstBYOCPlayCompleted = prefs[KEY_FIRST_BYOC_PLAY] ?: false,
            firstAIFeatureUsed = prefs[KEY_FIRST_AI_FEATURE_USED] ?: false,
            moreContentDismissed = prefs[KEY_MORE_CONTENT_DISMISSED] ?: false,
        )
    }

    suspend fun incrementSession() {
        dataStore.edit { prefs ->
            val current = prefs[KEY_SESSION_COUNT] ?: 0
            prefs[KEY_SESSION_COUNT] = current + 1
        }
    }

    suspend fun dismiss(sessionCount: Int) {
        dataStore.edit { prefs ->
            val current = prefs[KEY_DISMISS_COUNT] ?: 0
            prefs[KEY_DISMISS_COUNT] = current + 1
            prefs[KEY_LAST_DISMISS_SESSION] = sessionCount
        }
    }

    suspend fun permanentlyDismiss() {
        dataStore.edit { prefs ->
            prefs[KEY_PERMANENTLY_DISMISSED] = true
        }
    }

    suspend fun markFirstBYOCPlay() {
        dataStore.edit { prefs ->
            prefs[KEY_FIRST_BYOC_PLAY] = true
        }
    }

    suspend fun markFirstAIFeatureUsed() {
        dataStore.edit { prefs ->
            prefs[KEY_FIRST_AI_FEATURE_USED] = true
        }
    }

    suspend fun dismissMoreContent() {
        dataStore.edit { prefs ->
            prefs[KEY_MORE_CONTENT_DISMISSED] = true
        }
    }
}
