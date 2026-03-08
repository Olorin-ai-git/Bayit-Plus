package tv.bayit.plus.core.cast

import android.content.Context
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider

class BayitCastOptionsProvider : OptionsProvider {

    override fun getCastOptions(context: Context): CastOptions {
        val receiverAppId = context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_RECEIVER_APP_ID, null)
            ?: CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID

        return CastOptions.Builder()
            .setReceiverApplicationId(receiverAppId)
            .setStopReceiverApplicationWhenEndingSession(true)
            .build()
    }

    override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? = null

    companion object {
        internal const val PREFS_NAME = "bayit_cast_config"
        internal const val KEY_RECEIVER_APP_ID = "cast_receiver_app_id"

        fun configure(context: Context, receiverAppId: String) {
            context.applicationContext
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_RECEIVER_APP_ID, receiverAppId)
                .apply()
        }
    }
}
