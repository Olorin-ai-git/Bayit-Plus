package com.bayitplus

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.bayitplus.modules.VoiceModule
import com.bayitplus.modules.SpeechModule
import com.bayitplus.modules.TTSModule
import com.bayitplus.modules.LiveDubbingAudioModule
import com.bayitplus.modules.BiometricAuthModule
import com.bayitplus.modules.SecureStorageModule
import com.bayitplus.modules.DownloadModule
import com.bayitplus.modules.AppShortcutsModule
import com.bayitplus.modules.WidgetModule

/**
 * React Package for Bayit+ native modules
 * Registers all platform-specific Kotlin modules with React Native bridge
 */
class BayitPlusPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            VoiceModule(reactContext),
            SpeechModule(reactContext),
            TTSModule(reactContext),
            LiveDubbingAudioModule(reactContext),
            BiometricAuthModule(reactContext),
            SecureStorageModule(reactContext),
            DownloadModule(reactContext),
            AppShortcutsModule(reactContext),
            WidgetModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
