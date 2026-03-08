package tv.bayit.plus.core.byoc.persistence

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface BYOCSourceDao {

    @Query("SELECT * FROM byoc_sources ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<BYOCSourceEntity>>

    @Query("SELECT * FROM byoc_sources")
    suspend fun getAll(): List<BYOCSourceEntity>

    @Query("SELECT * FROM byoc_sources WHERE id = :id")
    suspend fun getById(id: String): BYOCSourceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: BYOCSourceEntity)

    @Query("DELETE FROM byoc_sources WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE byoc_sources SET lastSyncAt = :syncAt, status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, syncAt: Long, status: String)
}
