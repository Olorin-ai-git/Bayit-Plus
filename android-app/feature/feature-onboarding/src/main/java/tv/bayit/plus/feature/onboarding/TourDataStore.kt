package tv.bayit.plus.feature.onboarding

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private const val DATASTORE_NAME = "bayit_feature_tour"

private val Context.tourDataStore: DataStore<Preferences>
    by preferencesDataStore(name = DATASTORE_NAME)

private val KEY_COMPLETION_STATUS = stringPreferencesKey("completion_status")
private val KEY_CURRENT_INDEX = intPreferencesKey("current_card_index")
private val KEY_COMPLETED_CARDS = stringSetPreferencesKey("completed_cards")
private val KEY_DEMO_TAPPED = stringSetPreferencesKey("demo_cards_tapped")
private val KEY_PROMPT_DISMISS_COUNT = intPreferencesKey("prompt_dismiss_count")

data class TourLocalState(
    val completionStatus: String,
    val currentCardIndex: Int,
    val completedCards: Set<String>,
    val demoCardsTapped: Set<String>,
)

@Singleton
class TourDataStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val dataStore: DataStore<Preferences>
        get() = context.tourDataStore

    suspend fun load(): TourLocalState {
        val prefs = dataStore.data.first()
        return TourLocalState(
            completionStatus = prefs[KEY_COMPLETION_STATUS] ?: "not_started",
            currentCardIndex = prefs[KEY_CURRENT_INDEX] ?: 0,
            completedCards = prefs[KEY_COMPLETED_CARDS] ?: emptySet(),
            demoCardsTapped = prefs[KEY_DEMO_TAPPED] ?: emptySet(),
        )
    }

    suspend fun saveIndex(index: Int) {
        dataStore.edit { prefs -> prefs[KEY_CURRENT_INDEX] = index }
    }

    suspend fun markCardViewed(featureKey: String) {
        dataStore.edit { prefs ->
            val current = prefs[KEY_COMPLETED_CARDS] ?: emptySet()
            prefs[KEY_COMPLETED_CARDS] = current + featureKey
        }
    }

    suspend fun markDemoTapped(featureKey: String) {
        dataStore.edit { prefs ->
            val current = prefs[KEY_DEMO_TAPPED] ?: emptySet()
            prefs[KEY_DEMO_TAPPED] = current + featureKey
        }
    }

    suspend fun setCompleted() {
        dataStore.edit { prefs -> prefs[KEY_COMPLETION_STATUS] = "completed" }
    }

    suspend fun setSkipped() {
        dataStore.edit { prefs -> prefs[KEY_COMPLETION_STATUS] = "skipped" }
    }

    suspend fun setInProgress() {
        dataStore.edit { prefs -> prefs[KEY_COMPLETION_STATUS] = "in_progress" }
    }

    suspend fun setTipsDisabled() {
        dataStore.edit { prefs -> prefs[KEY_COMPLETION_STATUS] = "tips_disabled" }
    }

    suspend fun reset() {
        dataStore.edit { prefs ->
            prefs[KEY_COMPLETION_STATUS] = "not_started"
            prefs[KEY_CURRENT_INDEX] = 0
            prefs.remove(KEY_COMPLETED_CARDS)
            prefs.remove(KEY_DEMO_TAPPED)
        }
    }

    suspend fun getDismissedPromptCount(): Int {
        val prefs = dataStore.data.first()
        return prefs[KEY_PROMPT_DISMISS_COUNT] ?: 0
    }

    suspend fun incrementDismissedPromptCount() {
        dataStore.edit { prefs ->
            val current = prefs[KEY_PROMPT_DISMISS_COUNT] ?: 0
            prefs[KEY_PROMPT_DISMISS_COUNT] = current + 1
        }
    }
}
