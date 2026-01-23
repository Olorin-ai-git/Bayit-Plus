import logger from '@/utils/logger'

export function checkAudioSupport(): boolean {
  const audio = document.createElement('audio')
  return !!(audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
}

export function checkWebAudioAPI(): boolean {
  return !!(window.AudioContext || (window as any).webkitAudioContext)
}

export async function unlockAudioContext(): Promise<void> {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContext) return

  const context = new AudioContext()

  const buffer = context.createBuffer(1, 1, 22050)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.start(0)

  await context.resume()
}

export async function enableAutoplay(audioElement: HTMLAudioElement): Promise<boolean> {
  try {
    await audioElement.play()
    return true
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      logger.warn('Autoplay blocked by browser. User interaction required.', 'audioCompatibility')
      return false
    }
    throw err
  }
}

export function configureCORS(audioElement: HTMLAudioElement): void {
  audioElement.crossOrigin = 'anonymous'
}

export function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')
}

export async function setupSafariAudio(audioElement: HTMLAudioElement): Promise<void> {
  if (!isSafari()) return

  configureCORS(audioElement)

  await unlockAudioContext()

  audioElement.preload = 'metadata'

  audioElement.load()
}
