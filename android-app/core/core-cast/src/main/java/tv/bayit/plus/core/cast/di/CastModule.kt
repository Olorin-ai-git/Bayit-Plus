package tv.bayit.plus.core.cast.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.cast.CastSessionManager
import tv.bayit.plus.core.cast.CastSessionManagerImpl
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class CastModule {

    @Binds
    @Singleton
    abstract fun bindCastSessionManager(
        impl: CastSessionManagerImpl,
    ): CastSessionManager
}
