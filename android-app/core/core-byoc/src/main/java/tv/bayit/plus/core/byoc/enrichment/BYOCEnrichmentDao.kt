package tv.bayit.plus.core.byoc.enrichment

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface BYOCEnrichmentDao {

    @Query("SELECT * FROM byoc_enrichment WHERE externalId = :externalId")
    suspend fun getByExternalId(externalId: String): BYOCEnrichmentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: BYOCEnrichmentEntity)

    @Query("DELETE FROM byoc_enrichment WHERE externalId = :externalId")
    suspend fun deleteByExternalId(externalId: String)
}
