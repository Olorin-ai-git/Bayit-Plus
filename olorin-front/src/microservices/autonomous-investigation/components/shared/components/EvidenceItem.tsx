/**
 * Evidence Item Component
 *
 * Individual evidence item renderer for the EvidencePanel component.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';
import { Evidence } from '../hooks/useEvidenceFilters';

export interface EvidenceItemProps {
  evidence: Evidence;
  isSelected: boolean;
  showPreview: boolean;
  showConfidence: boolean;
  showRelevance: boolean;
  evidenceRenderer?: (evidence: Evidence) => React.ReactNode;
  onSelect: (evidence: Evidence) => void;
  onPreview?: (evidence: Evidence) => void;
  onDownload?: (evidence: Evidence) => void;
}

export const EvidenceItem: React.FC<EvidenceItemProps> = ({
  evidence: ev,
  isSelected,
  showPreview,
  showConfidence,
  showRelevance,
  evidenceRenderer,
  onSelect,
  onPreview,
  onDownload,
}) => {
  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'document': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'data': return '📊';
      case 'log': return '📝';
      case 'network': return '🌐';
      case 'financial': return '💰';
      default: return '📎';
    }
  };

  const formatScore = (score: number) => Math.round(score * 100);
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  const handleClick = () => onSelect(ev);

  if (evidenceRenderer) {
    return (
      <div className="p-4">
        {evidenceRenderer(ev)}
      </div>
    );
  }

  return (
    <div
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEvidenceIcon(ev.type)}</span>
            <h4 className="font-medium text-gray-900">{ev.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            {showConfidence && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {formatScore(ev.confidence)}% conf
              </span>
            )}
            {showRelevance && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                {formatScore(ev.relevance)}% rel
              </span>
            )}
          </div>
        </div>

        {ev.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{ev.description}</p>
        )}

        {showPreview && ev.content?.preview && (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-3">
            {ev.content.preview}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Source: {ev.source}</span>
            <span>{formatTimestamp(ev.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2">
            {ev.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 rounded">
                {tag}
              </span>
            ))}
            {ev.tags.length > 3 && (
              <span>+{ev.tags.length - 3}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(ev);
              }}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Preview
            </button>
          )}
          {onDownload && ev.content?.downloadUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(ev);
              }}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-800 underline"
            >
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
};