/**
 * RecordingCard Component Tests
 * Tests for notification migration to @olorin/glass-ui/hooks
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { RecordingCard } from '../RecordingCard'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'

// Mock dependencies
jest.mock('@olorin/glass-ui/hooks')
jest.mock('@/utils/logger')
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}))

describe('RecordingCard', () => {
  const mockShow = jest.fn()
  const mockOnDelete = jest.fn()

  const mockRecording = {
    id: 'rec-123',
    title: 'Test Recording',
    thumbnail: 'https://example.com/thumb.jpg',
    duration_seconds: 3600,
    file_size_bytes: 1073741824,
    recorded_at: '2026-01-26T10:00:00Z',
    auto_delete_at: '2026-02-26T10:00:00Z',
    subtitle_url: 'https://example.com/subs.vtt',
    channel_id: 'channel-1',
  }

  const formatBytes = (bytes: number) => `${(bytes / 1073741824).toFixed(2)} GB`
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }
  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNotifications as jest.Mock).mockReturnValue({
      show: mockShow,
    })
  })

  describe('Delete Confirmation', () => {
    it('shows confirmation notification on delete press', async () => {
      const { getByTestId } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      const deleteButton = getByTestId('delete-button') || getByTestId('trash-icon')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warning',
            title: 'recordings.deleteRecording',
            message: 'recordings.confirmDelete',
            action: expect.objectContaining({
              label: 'common.delete',
              type: 'action',
              onPress: expect.any(Function),
            }),
            dismissable: true,
          })
        )
      })
    })

    it('calls onDelete when confirmation action pressed', async () => {
      let actionHandler: (() => void) | undefined

      mockShow.mockImplementation((options) => {
        actionHandler = options.action?.onPress
        return '1'
      })

      const { getByTestId } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      const deleteButton = getByTestId('delete-button') || getByTestId('trash-icon')
      fireEvent.press(deleteButton)

      await waitFor(() => expect(mockShow).toHaveBeenCalled())

      // Execute the action handler
      expect(actionHandler).toBeDefined()
      actionHandler!()

      expect(logger.info).toHaveBeenCalledWith(
        'Recording deletion confirmed',
        'RecordingCard',
        { id: 'rec-123' }
      )
      expect(mockOnDelete).toHaveBeenCalledWith('rec-123')
    })

    it('uses warning level for destructive action', async () => {
      const { getByTestId } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      const deleteButton = getByTestId('delete-button') || getByTestId('trash-icon')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warning',
          })
        )
      })
    })

    it('confirmation modal is dismissable', async () => {
      const { getByTestId } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      const deleteButton = getByTestId('delete-button') || getByTestId('trash-icon')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            dismissable: true,
          })
        )
      })
    })
  })

  describe('Recording Display', () => {
    it('renders recording information correctly', () => {
      const { getByText } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      expect(getByText('Test Recording')).toBeTruthy()
      expect(getByText('1h 0m')).toBeTruthy()
      expect(getByText('1.00 GB')).toBeTruthy()
    })

    it('shows subtitle badge when subtitles available', () => {
      const { getByText } = render(
        <RecordingCard
          recording={mockRecording}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      expect(getByText('recordings.subtitlesAvailable')).toBeTruthy()
    })

    it('does not show subtitle badge when no subtitles', () => {
      const recordingWithoutSubs = { ...mockRecording, subtitle_url: undefined }

      const { queryByText } = render(
        <RecordingCard
          recording={recordingWithoutSubs}
          onDelete={mockOnDelete}
          formatBytes={formatBytes}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )

      expect(queryByText('recordings.subtitlesAvailable')).toBeNull()
    })
  })
})
