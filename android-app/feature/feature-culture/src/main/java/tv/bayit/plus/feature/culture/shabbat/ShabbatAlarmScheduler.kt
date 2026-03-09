package tv.bayit.plus.feature.culture.shabbat

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShabbatAlarmScheduler @Inject constructor(
    private val logger: BayitLogger,
) {

    fun scheduleCandleLighting(context: Context, triggerTimeMs: Long) {
        scheduleAlarm(context, triggerTimeMs, ACTION_CANDLE_LIGHTING, REQUEST_CODE_CANDLE_LIGHTING)
        logger.info(
            "Scheduled candle lighting alarm",
            mapOf("triggerMs" to triggerTimeMs.toString()),
        )
    }

    fun scheduleHavdalah(context: Context, triggerTimeMs: Long) {
        scheduleAlarm(context, triggerTimeMs, ACTION_HAVDALAH, REQUEST_CODE_HAVDALAH)
        logger.info(
            "Scheduled havdalah alarm",
            mapOf("triggerMs" to triggerTimeMs.toString()),
        )
    }

    fun cancelAll(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        cancelAlarm(context, alarmManager, ACTION_CANDLE_LIGHTING, REQUEST_CODE_CANDLE_LIGHTING)
        cancelAlarm(context, alarmManager, ACTION_HAVDALAH, REQUEST_CODE_HAVDALAH)
        logger.info("Cancelled all Shabbat alarms")
    }

    private fun scheduleAlarm(context: Context, triggerTimeMs: Long, action: String, requestCode: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ShabbatAlarmReceiver::class.java).apply {
            this.action = action
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
        }
    }

    private fun cancelAlarm(context: Context, alarmManager: AlarmManager, action: String, requestCode: Int) {
        val intent = Intent(context, ShabbatAlarmReceiver::class.java).apply {
            this.action = action
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
        }
    }

    companion object {
        const val ACTION_CANDLE_LIGHTING = "tv.bayit.plus.SHABBAT_CANDLE_LIGHTING"
        const val ACTION_HAVDALAH = "tv.bayit.plus.SHABBAT_HAVDALAH"
        private const val REQUEST_CODE_CANDLE_LIGHTING = 7001
        private const val REQUEST_CODE_HAVDALAH = 7002
    }
}

class ShabbatAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ShabbatAlarmScheduler.ACTION_CANDLE_LIGHTING -> {
                ShabbatNotificationHelper.showShabbatActivated(context)
            }
            ShabbatAlarmScheduler.ACTION_HAVDALAH -> {
                ShabbatNotificationHelper.showShabbatDeactivated(context)
            }
        }
    }
}
