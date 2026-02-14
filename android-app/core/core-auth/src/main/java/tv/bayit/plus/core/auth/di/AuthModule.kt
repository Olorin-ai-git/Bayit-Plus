package tv.bayit.plus.core.auth.di

import com.google.firebase.auth.FirebaseAuth
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.auth.AuthTokenProviderImpl
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthProvidesModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthBindingsModule {

    @Binds
    abstract fun bindAuthTokenProvider(
        impl: AuthTokenProviderImpl,
    ): AuthTokenProvider
}
