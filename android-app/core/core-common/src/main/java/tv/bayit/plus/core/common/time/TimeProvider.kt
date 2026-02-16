package tv.bayit.plus.core.common.time

import javax.inject.Inject
import javax.inject.Singleton

/** Abstraction over system time for testability and DI compliance. */
interface TimeProvider {
    fun currentTimeMillis(): Long
}

/** Default production implementation using system clock. */
@Singleton
class SystemTimeProvider @Inject constructor() : TimeProvider {
    override fun currentTimeMillis(): Long = System.currentTimeMillis()
}
