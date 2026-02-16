/**
 * VOD Interaction - Usage Example
 *
 * Example showing how to integrate VOD avatar interactions
 * into an existing video player page.
 */

import React from 'react';
import { VODInteractionPlayer } from './VODInteractionPlayer';

interface Props {
  contentId: string;
  videoUrl: string;
}

export const VODInteractionExample: React.FC<Props> = ({
  contentId,
  videoUrl
}) => {
  const profileId = 'current-profile-id';
  const avatarId = 'current-avatar-id';

  const handleInteractionComplete = (sessionId: string) => {
    console.log('Interaction completed:', sessionId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Watch with Avatar Interactions</h1>

        <VODInteractionPlayer
          contentId={contentId}
          profileId={profileId}
          avatarId={avatarId}
          videoUrl={videoUrl}
          onInteractionComplete={handleInteractionComplete}
          className="rounded-lg overflow-hidden shadow-2xl"
        />

        <div className="mt-6 text-sm text-gray-400">
          <p>
            This video has interactive moments where you can talk with characters.
            The video will pause automatically at these moments.
          </p>
        </div>
      </div>
    </div>
  );
};
