package tv.bayit.plus.core.byoc.enrichment

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "byoc_enrichment")
data class BYOCEnrichmentEntity(
    @PrimaryKey val externalId: String,
    val subtitleLanguages: String,
    val enrichmentStatus: String,
    val updatedAt: Long,
)
