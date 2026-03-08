package tv.bayit.plus.core.byoc.models

import kotlinx.serialization.Serializable

@Serializable
data class BYOCSourceConfig(
    val id: String,
    val name: String,
    val type: BYOCSourceType,
    val createdAt: Long,
    val lastSyncAt: Long?,
    val status: BYOCSourceStatus,
)

enum class BYOCSourceStatus {
    ACTIVE, ERROR, SYNCING, EXPIRED
}
