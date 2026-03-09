package tv.bayit.plus.core.byoc.persistence

import androidx.room.Database
import androidx.room.RoomDatabase
import tv.bayit.plus.core.byoc.enrichment.BYOCEnrichmentEntity

@Database(
    entities = [BYOCSourceEntity::class, BYOCEnrichmentEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class BYOCDatabase : RoomDatabase() {
    abstract fun sourceDao(): BYOCSourceDao
    abstract fun enrichmentDao(): tv.bayit.plus.core.byoc.enrichment.BYOCEnrichmentDao
}
