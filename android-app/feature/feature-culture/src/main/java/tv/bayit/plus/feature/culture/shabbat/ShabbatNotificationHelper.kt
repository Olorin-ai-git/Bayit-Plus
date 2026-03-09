package tv.bayit.plus.feature.culture.shabbat

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object ShabbatNotificationHelper {

    private const val CHANNEL_ID = "bayit_shabbat"
    private const val CHANNEL_NAME = "Shabbat Mode"
    private const val NOTIFICATION_ID_ACTIVATED = 8001
    private const val NOTIFICATION_ID_DEACTIVATED = 8002

    fun showShabbatActivated(context: Context) {
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Shabbat Shalom")
            .setContentText("Shabbat mode has been activated")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_ACTIVATED, notification)
        } catch (_: SecurityException) {
            // Notification permission not granted
        }
    }

    fun showShabbatDeactivated(context: Context) {
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Shavua Tov")
            .setContentText("Shabbat mode has been deactivated")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_DEACTIVATED, notification)
        } catch (_: SecurityException) {
            // Notification permission not granted
        }
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            )
            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
