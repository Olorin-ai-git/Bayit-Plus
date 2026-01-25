import { useState } from 'react'

/**
 * Hook to manage player panel visibility states
 * Extracted from VideoPlayer.tsx to comply with 200-line limit
 */
export function usePlayerPanels() {
  const [showChaptersPanel, setShowChaptersPanel] = useState(false)
  const [showSceneSearchPanel, setShowSceneSearchPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const toggleChaptersPanel = () => setShowChaptersPanel((prev) => !prev)
  const toggleSceneSearchPanel = () => setShowSceneSearchPanel((prev) => !prev)
  const toggleSettings = () => setShowSettings((prev) => !prev)

  const closeAllPanels = () => {
    setShowChaptersPanel(false)
    setShowSceneSearchPanel(false)
    setShowSettings(false)
  }

  return {
    // State
    showChaptersPanel,
    showSceneSearchPanel,
    showSettings,

    // Setters
    setShowChaptersPanel,
    setShowSceneSearchPanel,
    setShowSettings,

    // Toggle functions
    toggleChaptersPanel,
    toggleSceneSearchPanel,
    toggleSettings,

    // Utility
    closeAllPanels,
  }
}
