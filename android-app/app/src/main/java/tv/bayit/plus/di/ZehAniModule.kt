package tv.bayit.plus.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import tv.bayit.plus.data.api.ZehAniApiService
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ZehAniModule {

    @Provides
    @Singleton
    fun provideZehAniApiService(retrofit: Retrofit): ZehAniApiService {
        return retrofit.create(ZehAniApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideZehAniRepository(
        apiService: ZehAniApiService
    ): ZehAniRepository {
        return ZehAniRepository(apiService)
    }
}
