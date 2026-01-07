import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * AnimatedLogo Component
 * Matches TV app's AnimatedLogo with sliding text animation
 * - "בית" slides from right, "+" slides from left (Hebrew)
 * - Logo image fades in after text animation completes
 */
export default function AnimatedLogo({
  size = 'large',
  onAnimationComplete,
}) {
  const { i18n } = useTranslation()
  const isHebrew = i18n.language === 'he'

  const [textVisible, setTextVisible] = useState(false)
  const [bayitPosition, setBayitPosition] = useState(isHebrew ? 150 : -150)
  const [plusPosition, setPlusPosition] = useState(isHebrew ? -150 : 150)
  const [logoVisible, setLogoVisible] = useState(false)

  const sizes = {
    small: {
      logo: 'w-16 h-8',
      text: 'text-2xl',
      plus: 'text-xl',
      container: 'gap-1'
    },
    medium: {
      logo: 'w-24 h-12',
      text: 'text-4xl',
      plus: 'text-3xl',
      container: 'gap-2'
    },
    large: {
      logo: 'w-32 h-16',
      text: 'text-6xl',
      plus: 'text-5xl',
      container: 'gap-3'
    },
  }

  const currentSize = sizes[size] || sizes.large

  useEffect(() => {
    // Animation sequence matching TV app
    const timers = []

    // 1. Show text and start sliding
    timers.push(setTimeout(() => {
      setTextVisible(true)
    }, 100))

    // 2. Animate text to center (spring-like with CSS)
    timers.push(setTimeout(() => {
      setBayitPosition(0)
      setPlusPosition(0)
    }, 150))

    // 3. Delay before logo
    timers.push(setTimeout(() => {
      setLogoVisible(true)
    }, 1000))

    // 4. Animation complete callback
    timers.push(setTimeout(() => {
      onAnimationComplete?.()
    }, 2200))

    return () => timers.forEach(clearTimeout)
  }, [onAnimationComplete])

  return (
    <div className={`flex flex-col items-center justify-center ${currentSize.container}`}>
      {/* Logo Image - fades in after text */}
      <div
        className={`transition-all duration-1000 ease-out ${currentSize.logo} ${
          logoVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
        style={{ marginBottom: '-8px' }}
      >
        <img
          src="/logo.png"
          alt="Bayit+"
          className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,217,255,0.5)]"
        />
      </div>

      {/* Animated Text */}
      <div className="flex items-center justify-center overflow-visible">
        {isHebrew ? (
          <>
            {/* Hebrew: בית+ */}
            <span
              className={`font-bold text-white transition-all duration-700 ease-out ${currentSize.text}`}
              style={{
                transform: `translateX(${bayitPosition}px)`,
                opacity: textVisible ? 1 : 0,
                textShadow: '0 0 20px rgba(255,255,255,0.3)',
              }}
            >
              בית
            </span>
            <span
              className={`font-bold text-cyan-400 transition-all duration-700 ease-out ${currentSize.plus} ml-1`}
              style={{
                transform: `translateX(${plusPosition}px)`,
                opacity: textVisible ? 1 : 0,
                textShadow: '0 0 20px rgba(0,217,255,0.5)',
              }}
            >
              +
            </span>
          </>
        ) : (
          <>
            {/* English/Spanish: Bayit+ */}
            <span
              className={`font-bold text-cyan-400 transition-all duration-700 ease-out ${currentSize.plus} mr-1`}
              style={{
                transform: `translateX(${plusPosition}px)`,
                opacity: textVisible ? 1 : 0,
                textShadow: '0 0 20px rgba(0,217,255,0.5)',
              }}
            >
              +
            </span>
            <span
              className={`font-bold text-white transition-all duration-700 ease-out ${currentSize.text}`}
              style={{
                transform: `translateX(${bayitPosition}px)`,
                opacity: textVisible ? 1 : 0,
                textShadow: '0 0 20px rgba(255,255,255,0.3)',
              }}
            >
              Bayit
            </span>
          </>
        )}
      </div>
    </div>
  )
}
