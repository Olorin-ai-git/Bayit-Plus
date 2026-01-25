package com.bayitplus

import android.content.Context
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider

/**
 * Cast Options Provider
 * Configures Google Cast SDK with receiver application ID
 *
 * The receiver app ID should match the one configured in the React Native app
 * (from VITE_CHROMECAST_RECEIVER_APP_ID or app.json extra.castReceiverAppId)
 */
class CastOptionsProvider : OptionsProvider {

    override fun getCastOptions(context: Context): CastOptions {
        // Get receiver app ID from resources or use default
        // In production, this should match your Google Cast Receiver App ID
        val receiverAppId = getReceiverAppId(context)

        return CastOptions.Builder()
            .setReceiverApplicationId(receiverAppId)
            .setStopReceiverApplicationWhenEndingSession(true)
            .build()
    }

    override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? {
        return null
    }

    /**
     * Get receiver app ID from app resources
     * Fails fast if not configured (no hardcoded fallback)
     */
    private fun getReceiverAppId(context: Context): String {
        return try {
            // Try to read from string resources
            val resId = context.resources.getIdentifier(
                "cast_receiver_app_id",
                "string",
                context.packageName
            )
            if (resId != 0) {
                val receiverId = context.getString(resId)
                // Validate it's not the placeholder
                if (receiverId == "YOUR_RECEIVER_APP_ID_HERE") {
                    throw IllegalStateException(
                        "Chromecast receiver app ID not configured. " +
                        "Replace YOUR_RECEIVER_APP_ID_HERE in strings.xml with your actual receiver app ID."
                    )
                }
                receiverId
            } else {
                throw IllegalStateException(
                    "Chromecast receiver app ID not found. " +
                    "Add <string name=\"cast_receiver_app_id\">YOUR_ID_HERE</string> to strings.xml"
                )
            }
        } catch (e: IllegalStateException) {
            android.util.Log.e("CastOptionsProvider", "Cast configuration error: ${e.message}")
            throw e
        } catch (e: Exception) {
            android.util.Log.e("CastOptionsProvider", "Failed to load receiver app ID: ${e.message}")
            throw IllegalStateException("Failed to initialize Chromecast: ${e.message}", e)
        }
    }
}
