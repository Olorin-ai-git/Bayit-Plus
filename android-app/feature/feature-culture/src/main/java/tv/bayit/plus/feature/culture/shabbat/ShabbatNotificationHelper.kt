package tv.bayit.plus.feature.culture.shabbat

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import tv.bayit.plus.core.common.i18n.BayitStringProvider

object ShabbatNotificationHelper {

    private const val CHANNEL_ID = "bayit_shabbat"
    private const val NOTIFICATION_ID_ACTIVATED = 8001
    private const val NOTIFICATION_ID_DEACTIVATED = 8002

    fun showShabbatActivated(context: Context, stringProvider: BayitStringProvider) {
        ensureChannel(context, stringProvider)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(stringProvider.string("culture.shabbat.shabbatShalom"))
            .setContentText(stringProvider.string("culture.shabbat.modeActivated"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_ACTIVATED, notification)
        } catch (_: SecurityException) {
            // Notification permission not granted
        }
    }

    fun showShabbatDeactivated(context: Context, stringProvider: BayitStringProvider) {
        ensureChannel(context, stringProvider)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(stringProvider.string("culture.shabbat.shavuaTov"))
            .setContentText(stringProvider.string("culture.shabbat.modeDeactivated"))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_DEACTIVATED, notification)
        } catch (_: SecurityException) {
            // Notification permission not granted
        }
    }

    private fun ensureChannel(context: Context, stringProvider: BayitStringProvider) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                stringProvider.string("culture.shabbat.channelName"),
                NotificationManager.IMPORTANCE_HIGH,
            )
            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
