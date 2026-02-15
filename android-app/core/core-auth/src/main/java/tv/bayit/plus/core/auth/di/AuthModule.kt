package tv.bayit.plus.core.auth.di

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.auth.AuthTokenProviderImpl
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthProvidesModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(@ApplicationContext context: Context): FirebaseAuth {
        return try {
            if (FirebaseApp.getApps(context).isEmpty()) {
                val options = FirebaseOptions.Builder()
                    .setProjectId("bayit-plus-temp")
                    .setApplicationId("1:000000000000:android:0000000000000000000000")
                    .setApiKey("AIzaSyTemporaryKeyForDevelopment000000000")
                    .build()
                FirebaseApp.initializeApp(context, options)
            }
            FirebaseAuth.getInstance()
        } catch (e: Exception) {
            throw IllegalStateException("Firebase initialization failed. Please add google-services.json", e)
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthBindingsModule {

    @Binds
    abstract fun bindAuthTokenProvider(
        impl: AuthTokenProviderImpl,
    ): AuthTokenProvider
}
