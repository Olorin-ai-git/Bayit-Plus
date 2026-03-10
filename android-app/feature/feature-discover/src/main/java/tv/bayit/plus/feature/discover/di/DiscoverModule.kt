package tv.bayit.plus.feature.discover.di

import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.network.WalkthroughTokenProvider
import tv.bayit.plus.feature.discover.data.ApiDiscoverRepository
import tv.bayit.plus.feature.discover.data.AvailabilityDependencies
import tv.bayit.plus.feature.discover.data.DiscoverRepository
import tv.bayit.plus.feature.discover.walkthrough.WalkthroughSessionManager
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class DiscoverBindsModule {

    @Binds
    @Singleton
    abstract fun bindDiscoverRepository(
        impl: ApiDiscoverRepository,
    ): DiscoverRepository
}

@Module
@InstallIn(SingletonComponent::class)
object DiscoverProvidesModule {

    @Provides
    @Singleton
    fun provideAvailabilityDependencies(
        userRepository: UserRepository,
    ): AvailabilityDependencies = object : AvailabilityDependencies {
        override suspend fun isPremium(): Boolean {
            val result = userRepository.getPreferences()
            return result is BayitResult.Success
        }

        override suspend fun hasAvatar(): Boolean {
            val result = userRepository.getCurrentUser()
            return result is BayitResult.Success
        }

        override suspend fun hasMicrophonePermission(): Boolean = true

        override suspend fun hasCompletedPreference(id: String): Boolean = true
    }

    @Provides
    @Singleton
    fun provideWalkthroughTokenProvider(
        sessionManager: WalkthroughSessionManager,
    ): WalkthroughTokenProvider = object : WalkthroughTokenProvider {
        override fun getActiveToken(): String? = sessionManager.sessionToken
    }
}
