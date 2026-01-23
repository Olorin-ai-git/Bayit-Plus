import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AudioQuality } from '../types/podcast'

export function useNetworkQuality() {
  const [quality, setQuality] = useState<AudioQuality>('medium')
  const [networkType, setNetworkType] = useState<'wifi' | 'cellular' | 'none'>('wifi')

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const type = state.type === 'wifi' || state.type === 'ethernet' ? 'wifi' :
                   state.type === 'cellular' ? 'cellular' : 'none'
      setNetworkType(type)

      if (type === 'wifi') {
        setQuality('high')
      } else if (type === 'cellular') {
        const cellularPref = await AsyncStorage.getItem('@cellular_quality')
        setQuality((cellularPref as AudioQuality) || 'low')
      } else {
        setQuality('low')
      }
    })

    return () => unsubscribe()
  }, [])

  const setPreferredQuality = async (newQuality: AudioQuality) => {
    setQuality(newQuality)
    if (networkType === 'cellular') {
      await AsyncStorage.setItem('@cellular_quality', newQuality)
    }
  }

  return {
    quality,
    networkType,
    setQuality: setPreferredQuality,
    isOnline: networkType !== 'none',
  }
}
