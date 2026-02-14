package tv.bayit.plus.core.media.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt module for core-media dependencies.
 *
 * [tv.bayit.plus.core.media.BayitMediaPlayer] is annotated with @Singleton
 * and has an @Inject constructor, so Hilt provides it automatically.
 * This module exists as the standard entry-point for future media
 * bindings (e.g. Chromecast session manager, audio-focus handler).
 */
@Module
@InstallIn(SingletonComponent::class)
object MediaModule
