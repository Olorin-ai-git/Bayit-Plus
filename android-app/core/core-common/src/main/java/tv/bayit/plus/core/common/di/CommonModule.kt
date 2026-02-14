package tv.bayit.plus.core.common.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.correlation.CorrelationIdGenerator
import tv.bayit.plus.core.common.correlation.UuidCorrelationIdGenerator
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.logging.TimberBayitLogger
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CommonModule {

    @Provides
    @Singleton
    fun provideBayitLogger(): BayitLogger = TimberBayitLogger()

    @Provides
    @Singleton
    fun provideCorrelationIdGenerator(): CorrelationIdGenerator = UuidCorrelationIdGenerator()
}
