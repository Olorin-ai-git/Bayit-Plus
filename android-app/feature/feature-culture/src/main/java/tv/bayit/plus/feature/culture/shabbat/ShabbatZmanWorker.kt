package tv.bayit.plus.feature.culture.shabbat

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import tv.bayit.plus.feature.culture.shabbat.models.ShabbatZmanData
import java.util.concurrent.TimeUnit

val Context.shabbatDataStore: DataStore<Preferences> by preferencesDataStore(name = "shabbat_zman")

object ShabbatZmanKeys {
    val CANDLE_LIGHTING_MS = longPreferencesKey("candle_lighting_ms")
    val HAVDALAH_MS = longPreferencesKey("havdalah_ms")
    val PARASHA = stringPreferencesKey("parasha")
    val IS_SHABBAT_ACTIVE = booleanPreferencesKey("is_shabbat_active")
    val LOCATION_NAME = stringPreferencesKey("location_name")
    val LATITUDE = doublePreferencesKey("latitude")
    val LONGITUDE = doublePreferencesKey("longitude")
    val LAST_UPDATED_MS = longPreferencesKey("last_updated_ms")
    val DEFAULT_CITY = stringPreferencesKey("default_city")
    val DEFAULT_LATITUDE = doublePreferencesKey("default_latitude")
    val DEFAULT_LONGITUDE = doublePreferencesKey("default_longitude")
}

class ShabbatZmanWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val dataStore = applicationContext.shabbatDataStore
        val prefs = dataStore.data.first()

        val latitude = prefs[ShabbatZmanKeys.LATITUDE]
            ?: prefs[ShabbatZmanKeys.DEFAULT_LATITUDE]
            ?: DEFAULT_LATITUDE
        val longitude = prefs[ShabbatZmanKeys.LONGITUDE]
            ?: prefs[ShabbatZmanKeys.DEFAULT_LONGITUDE]
            ?: DEFAULT_LONGITUDE

        val now = System.currentTimeMillis()
        val candleLighting = prefs[ShabbatZmanKeys.CANDLE_LIGHTING_MS] ?: 0L
        val havdalah = prefs[ShabbatZmanKeys.HAVDALAH_MS] ?: 0L
        val isActive = now in candleLighting..havdalah

        dataStore.edit { mutablePrefs ->
            mutablePrefs[ShabbatZmanKeys.IS_SHABBAT_ACTIVE] = isActive
            mutablePrefs[ShabbatZmanKeys.LAST_UPDATED_MS] = now
        }

        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "shabbat_zman_update"
        private const val REPEAT_INTERVAL_MINUTES = 15L
        private const val DEFAULT_LATITUDE = 31.7683
        private const val DEFAULT_LONGITUDE = 35.2137

        fun enqueue(context: Context) {
            val request = PeriodicWorkRequestBuilder<ShabbatZmanWorker>(
                REPEAT_INTERVAL_MINUTES,
                TimeUnit.MINUTES,
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }

        suspend fun readZmanData(context: Context): ShabbatZmanData? {
            val prefs = context.shabbatDataStore.data.first()
            val candleLighting = prefs[ShabbatZmanKeys.CANDLE_LIGHTING_MS] ?: return null
            val havdalah = prefs[ShabbatZmanKeys.HAVDALAH_MS] ?: return null
            return ShabbatZmanData(
                candleLightingTimeMs = candleLighting,
                havdalahTimeMs = havdalah,
                parasha = prefs[ShabbatZmanKeys.PARASHA].orEmpty(),
                isShabbatActive = prefs[ShabbatZmanKeys.IS_SHABBAT_ACTIVE] ?: false,
                locationName = prefs[ShabbatZmanKeys.LOCATION_NAME].orEmpty(),
                latitude = prefs[ShabbatZmanKeys.LATITUDE] ?: DEFAULT_LATITUDE,
                longitude = prefs[ShabbatZmanKeys.LONGITUDE] ?: DEFAULT_LONGITUDE,
                lastUpdatedMs = prefs[ShabbatZmanKeys.LAST_UPDATED_MS] ?: 0L,
            )
        }
    }
}
