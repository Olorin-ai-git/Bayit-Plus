package com.bayitplus

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.google.android.gms.cast.framework.CastContext

/**
 * Main Activity for Bayit+ Android app
 * Initializes Chromecast and React Native
 */
class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "BayitPlus"

    /**
     * Returns the instance of the {@link ReactActivityDelegate}. We use {@link
     * DefaultReactActivityDelegate} which allows you to enable New Architecture with a single
     * boolean flag {@link fabricEnabled}
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Google Cast SDK
        // This must be done early in app lifecycle
        try {
            CastContext.getSharedInstance(applicationContext)
        } catch (e: Exception) {
            // Cast SDK initialization failed (device may not support Google Play Services)
            // App continues to work without casting functionality
            android.util.Log.w("MainActivity", "Failed to initialize Cast SDK: ${e.message}")
        }
    }
}
