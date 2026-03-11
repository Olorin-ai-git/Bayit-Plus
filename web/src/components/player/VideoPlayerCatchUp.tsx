/**
 * VideoPlayerCatchUp Component
 * Integrates Catch-Up overlay, button, and summary card into the player.
 * Renders on live channels for catch-up summaries.
 */

import { useCatchUp } from "./hooks";
import CatchUpOverlay from "./catchup/CatchUpOverlay";
import CatchUpButton from "./catchup/CatchUpButton";
import CatchUpSummaryCard from "./catchup/CatchUpSummaryCard";

interface VideoPlayerCatchUpProps {
  channelId: string;
  creditBalance: number;
  creditCost: number;
  programName?: string;
  autoDismissSeconds: number;
}

export default function VideoPlayerCatchUp({
  channelId,
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
  } = useCatchUp({ channelId });

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
          {...({ creditCost } as any)}
          disabled={!hasCredits}
          isLoading={isLoading}
          onPress={() => fetchSummary()}
        />
      )}
    </>
  );
}
