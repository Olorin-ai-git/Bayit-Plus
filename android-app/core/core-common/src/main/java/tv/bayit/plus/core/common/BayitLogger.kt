package tv.bayit.plus.core.common

import timber.log.Timber

object BayitLogger {
    fun init(isDebug: Boolean) {
        if (isDebug) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(CrashReportingTree())
        }
    }

    fun debug(message: String, vararg args: Any?) = Timber.d(message, *args)
    fun info(message: String, vararg args: Any?) = Timber.i(message, *args)
    fun warning(message: String, vararg args: Any?) = Timber.w(message, *args)
    fun error(message: String, throwable: Throwable? = null) {
        if (throwable != null) Timber.e(throwable, message) else Timber.e(message)
    }

    private class CrashReportingTree : Timber.Tree() {
        override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
            if (priority < android.util.Log.WARN) return
            // Forward to Crashlytics in production
        }
    }
}
