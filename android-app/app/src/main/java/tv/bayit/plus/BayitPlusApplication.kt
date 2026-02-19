package tv.bayit.plus

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber
import tv.bayit.plus.core.data.download.BayitDownloadManager
import javax.inject.Inject

@HiltAndroidApp
class BayitPlusApplication : Application() {

    @Inject lateinit var downloadManager: BayitDownloadManager

    override fun onCreate() {
        super.onCreate()

        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        downloadManager.initialize()

        Timber.tag("Bayit+").d("Application initialized")
    }
}
