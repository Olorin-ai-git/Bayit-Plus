package tv.bayit.plus.core.voice.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * Qualifier for the voice-dedicated [CoroutineScope].
 *
 * Use this to inject a long-lived scope that survives individual
 * voice interactions but is cancelled when the application is destroyed.
 */
@Qualifier
@Retention(AnnotationRetention.RUNTIME)
annotation class VoiceScope

/**
 * Hilt module for core-voice dependencies.
 *
 * [tv.bayit.plus.core.voice.SpeechRecognitionService] and
 * [tv.bayit.plus.core.voice.TTSService] are annotated with @Singleton
 * and have @Inject constructors, so Hilt provides them automatically.
 *
 * [tv.bayit.plus.core.voice.VoiceOrchestrator] is provided at the app level
 * because it depends on VoiceApiService which requires BayitApiClient from
 * the network/repository layer.
 *
 * This module provides shared infrastructure that leaf voice services need:
 * - A [VoiceScope]-qualified [CoroutineScope] with a [SupervisorJob] so that
 *   individual child failures do not cancel sibling coroutines.
 */
@Module
@InstallIn(SingletonComponent::class)
object VoiceModule {

    @Provides
    @Singleton
    @VoiceScope
    fun provideVoiceCoroutineScope(): CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
}
