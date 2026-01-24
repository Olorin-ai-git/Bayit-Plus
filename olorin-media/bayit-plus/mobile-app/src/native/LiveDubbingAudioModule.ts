/**
 * LiveDubbingAudioModule - React Native Bridge
 * Provides TypeScript interface for iOS native audio playback module
 */

import { NativeModules, Platform } from 'react-native'
import type { IAudioPlayer } from '@bayit/shared/services/liveDubbingService'
import logger from '@/utils/logger'

const moduleLogger = logger.scope('LiveDubbingAudio')

interface NativeLiveDubbingAudio {
  playAudio(base64Audio: string): Promise<{ success: boolean; duration: number }>
  setDubbedVolume(volume: number): Promise<{ volume: number }>
  setOriginalVolume(volume: number): Promise<{ volume: number }>
  stop(): Promise<{ stopped: boolean }>
  cleanup(): Promise<{ success: boolean }>
  isPlaying(): Promise<{ playing: boolean }>
}

const NativeModule: NativeLiveDubbingAudio | undefined =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? NativeModules.LiveDubbingAudioModule
    : undefined

/**
 * LiveDubbingAudioPlayer implements IAudioPlayer for native platforms
 */
export class LiveDubbingAudioPlayer implements IAudioPlayer {
  private originalVolume = 0
  private dubbedVolume = 1

  async playAudio(base64Audio: string): Promise<void> {
    if (!NativeModule) {
      moduleLogger.warn('Native module not available')
      return
    }

    try {
      const result = await NativeModule.playAudio(base64Audio)
      moduleLogger.info('Played audio', { duration: result.duration })
    } catch (error) {
      moduleLogger.error('Error playing audio', error)
      throw error
    }
  }

  setOriginalVolume(volume: number): void {
    this.originalVolume = Math.max(0, Math.min(1, volume))
    NativeModule?.setOriginalVolume(this.originalVolume).catch((err) => {
      moduleLogger.error('Error setting original volume', err)
    })
  }

  setDubbedVolume(volume: number): void {
    this.dubbedVolume = Math.max(0, Math.min(1, volume))
    NativeModule?.setDubbedVolume(this.dubbedVolume).catch((err) => {
      moduleLogger.error('Error setting dubbed volume', err)
    })
  }

  cleanup(): void {
    NativeModule?.cleanup().catch((err) => {
      moduleLogger.error('Error during cleanup', err)
    })
  }

  async stop(): Promise<void> {
    if (!NativeModule) return
    await NativeModule.stop()
  }

  async isPlaying(): Promise<boolean> {
    if (!NativeModule) return false
    const result = await NativeModule.isPlaying()
    return result.playing
  }
}

// Export singleton instance
export const liveDubbingAudioPlayer = new LiveDubbingAudioPlayer()

// Export native module for direct access if needed
export { NativeModule as LiveDubbingAudioNativeModule }
