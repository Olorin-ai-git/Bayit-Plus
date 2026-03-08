package tv.bayit.plus.core.byoc.persistence

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "byoc_sources")
data class BYOCSourceEntity(
    @PrimaryKey val id: String,
    val name: String,
    val type: String,
    val credentials: String,
    val createdAt: Long,
    val lastSyncAt: Long?,
    val status: String,
)
