package tv.bayit.plus

import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics
import dagger.hilt.android.HiltAndroidApp
import android.app.Application
import timber.log.Timber
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.download.BayitDownloadManager
import javax.inject.Inject

@HiltAndroidApp
class BayitPlusApplication : Application() {

    @Inject lateinit var downloadManager: BayitDownloadManager
    @Inject lateinit var logger: BayitLogger

    override fun onCreate() {
        super.onCreate()

        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(CrashReportingTree())
        }

        downloadManager.initialize()

        logger.info("Application initialized", mapOf("version" to BuildConfig.VERSION_NAME))
    }

    private class CrashReportingTree : Timber.Tree() {
        override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
            if (priority < Log.WARN) return
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.log("[$tag] $message")
            if (priority >= Log.ERROR && t != null) {
                crashlytics.recordException(t)
            }
        }
    }
}
