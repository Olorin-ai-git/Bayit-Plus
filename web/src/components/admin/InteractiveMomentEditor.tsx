/**
 * Interactive Moment Editor - Admin Component
 *
 * Admin tool for marking interactive moments in VOD content.
 * Allows content curators to:
 * - Mark timestamps where avatar interactions can occur
 * - Extract character frames for animation
 * - Set character metadata and prompts
 */

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '@bayit/glass';
import api from '../../services/api';

interface InteractiveMoment {
  timestamp: number;
  duration: number;
  scene_context: string;
  character_name: string;
  character_frame_url?: string;
  interaction_prompt: string;
}

interface Props {
  contentId: string;
  videoUrl: string;
  onClose: () => void;
}

export const InteractiveMomentEditor: React.FC<Props> = ({
  contentId,
  videoUrl,
  onClose
}) => {
  const [moments, setMoments] = useState<InteractiveMoment[]>([]);
  const [newMoment, setNewMoment] = useState<Partial<InteractiveMoment>>({
    timestamp: 0,
    duration: 30,
    scene_context: '',
    character_name: '',
    interaction_prompt: ''
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadMoments();
  }, [contentId]);

  const loadMoments = async () => {
    try {
      const content = await api.get(`/admin/content/${contentId}`);
      setMoments(content.interactive_moments || []);
    } catch (error) {
      console.error('Failed to load interactive moments:', error);
    }
  };

  const handleSetTimestamp = () => {
    if (videoRef.current) {
      setNewMoment({
        ...newMoment,
        timestamp: videoRef.current.currentTime
      });
    }
  };

  const handleExtractFrame = async () => {
    if (!newMoment.timestamp) {
      alert('Please set a timestamp first');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await api.post('/admin/content/extract-frame', {
        content_id: contentId,
        timestamp: newMoment.timestamp
      });

      setNewMoment({
        ...newMoment,
        character_frame_url: response.frame_url
      });
    } catch (error) {
      console.error('Frame extraction failed:', error);
      alert('Failed to extract frame');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddMoment = async () => {
    if (!newMoment.character_name || !newMoment.interaction_prompt) {
      alert('Please fill in all required fields');
      return;
    }

    const moment: InteractiveMoment = {
      timestamp: newMoment.timestamp || 0,
      duration: newMoment.duration || 30,
      scene_context: newMoment.scene_context || '',
      character_name: newMoment.character_name,
      character_frame_url: newMoment.character_frame_url,
      interaction_prompt: newMoment.interaction_prompt
    };

    setMoments([...moments, moment]);

    setNewMoment({
      timestamp: 0,
      duration: 30,
      scene_context: '',
      character_name: '',
      interaction_prompt: ''
    });
  };

  const handleSaveAllMoments = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/admin/content/${contentId}/interactive-moments`, {
        moments
      });
      alert('Interactive moments saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save moments:', error);
      alert('Failed to save moments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMoment = (index: number) => {
    setMoments(moments.filter((_, i) => i !== index));
  };

  const handleSeekToMoment = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <GlassCard className="w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Interactive Moment Editor</h2>
          <GlassButton onClick={onClose} variant="secondary">
            Close
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Video Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Video Preview</h3>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-lg"
            />

            {/* Existing Moments Timeline */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Interactive Moments ({moments.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {moments.map((moment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{moment.character_name}</div>
                      <div className="text-sm text-gray-300">
                        {formatTime(moment.timestamp)} - {moment.interaction_prompt}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => handleSeekToMoment(moment.timestamp)}
                        variant="secondary"
                        size="sm"
                      >
                        Seek
                      </GlassButton>
                      <GlassButton
                        onClick={() => handleDeleteMoment(index)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New Moment Form */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Add New Moment</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Timestamp</label>
                <div className="flex gap-2">
                  <GlassInput
                    type="number"
                    value={newMoment.timestamp || 0}
                    onChange={(e) => setNewMoment({ ...newMoment, timestamp: parseFloat(e.target.value) })}
                    placeholder="0.0"
                    step="0.1"
                  />
                  <GlassButton onClick={handleSetTimestamp} variant="secondary">
                    Use Current Time
                  </GlassButton>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Current: {formatTime(newMoment.timestamp || 0)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
                <GlassInput
                  type="number"
                  value={newMoment.duration || 30}
                  onChange={(e) => setNewMoment({ ...newMoment, duration: parseInt(e.target.value) })}
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Character Name</label>
                <GlassInput
                  type="text"
                  value={newMoment.character_name || ''}
                  onChange={(e) => setNewMoment({ ...newMoment, character_name: e.target.value })}
                  placeholder="e.g., Moshe Rabbenu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Scene Context</label>
                <textarea
                  value={newMoment.scene_context || ''}
                  onChange={(e) => setNewMoment({ ...newMoment, scene_context: e.target.value })}
                  placeholder="Brief description of what's happening in the scene"
                  className="w-full px-3 py-2 bg-white bg-opacity-10 rounded border border-white border-opacity-20 focus:outline-none focus:border-opacity-40"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Interaction Prompt</label>
                <GlassInput
                  type="text"
                  value={newMoment.interaction_prompt || ''}
                  onChange={(e) => setNewMoment({ ...newMoment, interaction_prompt: e.target.value })}
                  placeholder="e.g., Ask Moshe about the Ten Commandments"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Character Frame</label>
                <div className="flex gap-2">
                  <GlassButton
                    onClick={handleExtractFrame}
                    isLoading={isExtracting}
                    disabled={!newMoment.timestamp}
                  >
                    Extract Frame at Timestamp
                  </GlassButton>
                </div>
                {newMoment.character_frame_url && (
                  <img
                    src={newMoment.character_frame_url}
                    alt="Character frame"
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <GlassButton onClick={handleAddMoment} className="flex-1">
                  Add Moment
                </GlassButton>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-2">
          <GlassButton onClick={onClose} variant="secondary">
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSaveAllMoments}
            isLoading={isSaving}
            disabled={moments.length === 0}
          >
            Save All Moments ({moments.length})
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};
