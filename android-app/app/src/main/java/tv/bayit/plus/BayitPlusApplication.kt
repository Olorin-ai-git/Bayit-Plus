package tv.bayit.plus

import android.app.Application
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class BayitPlusApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        initializeFirebase()

        Timber.tag("Bayit+").d("Application initialized")
    }

    private fun initializeFirebase() {
        try {
            FirebaseApp.initializeApp(this)
            Timber.tag("Bayit+").d("Firebase initialized successfully")
        } catch (e: Exception) {
            Timber.tag("Bayit+").e(e, "Failed to initialize Firebase")
        }
    }
}
