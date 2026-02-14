package tv.bayit.plus.core.common

import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

interface CorrelationIdProvider {
    fun generate(): String
}

@Singleton
class CorrelationIdGenerator @Inject constructor() : CorrelationIdProvider {
    override fun generate(): String = UUID.randomUUID().toString()
}
