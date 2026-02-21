package tv.bayit.plus.core.auth.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.auth.AuthTokenProviderImpl
import tv.bayit.plus.core.auth.AuthTokenStorage
import tv.bayit.plus.core.auth.SecureStorageService
import tv.bayit.plus.core.network.AuthTokenProvider

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthBindingsModule {

    @Binds
    abstract fun bindAuthTokenProvider(
        impl: AuthTokenProviderImpl,
    ): AuthTokenProvider

    @Binds
    abstract fun bindAuthTokenStorage(
        impl: SecureStorageService,
    ): AuthTokenStorage
}
