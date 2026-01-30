/**
 * VideoPlayerCatchUp Component
 * Integrates Catch-Up overlay, button, and summary card into the player.
 * Only renders for Beta 500 users on live channels.
 */

import { useCatchUp } from './hooks'
import CatchUpOverlay from './catchup/CatchUpOverlay'
import CatchUpButton from './catchup/CatchUpButton'
import CatchUpSummaryCard from './catchup/CatchUpSummaryCard'

interface VideoPlayerCatchUpProps {
  channelId: string
  isBetaUser: boolean
  creditBalance: number
  creditCost: number
  programName?: string
  autoDismissSeconds: number
}

export default function VideoPlayerCatchUp({
  channelId,
  isBetaUser,
  creditBalance,
  creditCost,
  programName,
  autoDismissSeconds,
}: VideoPlayerCatchUpProps) {
  const {
    showAutoPrompt,
    showSummary,
    summary,
    isLoading,
    hasCredits,
    fetchSummary,
    dismissAutoPrompt,
    closeSummary,
  } = useCatchUp({ channelId, isBetaUser })

  if (!isBetaUser) return null

  return (
    <>
      {showAutoPrompt && (
        <CatchUpOverlay
          channelId={channelId}
          programName={programName}
          creditCost={creditCost}
          creditBalance={creditBalance}
          onAccept={() => fetchSummary()}
          onDecline={dismissAutoPrompt}
          autoDismissSeconds={autoDismissSeconds}
        />
      )}

      {showSummary && summary && (
        <CatchUpSummaryCard summary={summary} onClose={closeSummary} />
      )}

      {!showAutoPrompt && !showSummary && (
        <CatchUpButton
          creditCost={creditCost}
          disabled={!hasCredits}
          isLoading={isLoading}
          onPress={() => fetchSummary()}
        />
      )}
    </>
  )
}
