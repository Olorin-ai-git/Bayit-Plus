package tv.bayit.plus.core.byoc.di

import android.content.Context
import android.content.SharedPreferences
import androidx.room.Room
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.BYOCSourceManagerImpl
import tv.bayit.plus.core.byoc.enrichment.BYOCEnrichmentDao
import tv.bayit.plus.core.byoc.persistence.BYOCDatabase
import tv.bayit.plus.core.byoc.persistence.BYOCKeychainStore
import tv.bayit.plus.core.byoc.persistence.BYOCSourceDao
import javax.inject.Qualifier
import javax.inject.Singleton

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BYOCEncryptedPrefs

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BYOCScope

@Module
@InstallIn(SingletonComponent::class)
object BYOCProvidesModule {

    @Provides
    @Singleton
    fun provideBYOCDatabase(
        @ApplicationContext context: Context,
    ): BYOCDatabase = Room.databaseBuilder(
        context,
        BYOCDatabase::class.java,
        DB_NAME,
    ).fallbackToDestructiveMigration().build()

    @Provides
    @Singleton
    fun provideBYOCSourceDao(database: BYOCDatabase): BYOCSourceDao =
        database.sourceDao()

    @Provides
    @Singleton
    fun provideBYOCEnrichmentDao(database: BYOCDatabase): BYOCEnrichmentDao =
        database.enrichmentDao()

    @Provides
    @Singleton
    @BYOCEncryptedPrefs
    fun provideBYOCEncryptedPrefs(
        @ApplicationContext context: Context,
    ): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    @Provides
    @Singleton
    fun provideBYOCKeychainStore(
        @BYOCEncryptedPrefs prefs: SharedPreferences,
    ): BYOCKeychainStore = BYOCKeychainStore(prefs)

    @Provides
    @Singleton
    @BYOCScope
    fun provideBYOCScope(): CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private const val DB_NAME = "byoc_database"
    private const val PREFS_NAME = "byoc_encrypted_prefs"
}

@Module
@InstallIn(SingletonComponent::class)
abstract class BYOCBindsModule {

    @Binds
    @Singleton
    abstract fun bindBYOCSourceManager(impl: BYOCSourceManagerImpl): BYOCSourceManager
}
