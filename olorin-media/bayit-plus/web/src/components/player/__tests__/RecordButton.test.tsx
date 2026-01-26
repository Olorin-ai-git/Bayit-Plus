/**
 * RecordButton Component Tests
 * Tests for notification migration to @olorin/glass-ui/hooks
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { RecordButton } from '../RecordButton'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { recordingApi } from '@/services/recordingApi'
import logger from '@/utils/logger'

// Mock dependencies
jest.mock('@olorin/glass-ui/hooks')
jest.mock('@/services/recordingApi')
jest.mock('@/utils/logger')
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'test-user' } }),
}))

describe('RecordButton', () => {
  const mockShowError = jest.fn()
  const mockShowSuccess = jest.fn()
  const mockOnShowUpgrade = jest.fn()
  const mockOnRecordingStateChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNotifications as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    })
  })

  const defaultProps = {
    channelId: 'test-channel',
    isLive: true,
    isPremium: true,
    onShowUpgrade: mockOnShowUpgrade,
    onRecordingStateChange: mockOnRecordingStateChange,
  }

  describe('Success Notifications', () => {
    it('shows success notification on recording stop', async () => {
      const mockSession = {
        id: 'session-123',
        recording_id: 'rec-123',
        channel_id: 'test-channel',
        started_at: new Date().toISOString(),
      }

      const mockRecording = {
        id: 'rec-123',
        duration_seconds: 120,
      }

      ;(recordingApi.startRecording as jest.Mock).mockResolvedValue(mockSession)
      ;(recordingApi.stopRecording as jest.Mock).mockResolvedValue(mockRecording)

      const { getByText } = render(<RecordButton {...defaultProps} />)

      // Start recording
      fireEvent.press(getByText('recordings.record'))
      await waitFor(() => expect(recordingApi.startRecording).toHaveBeenCalled())

      // Stop recording
      fireEvent.press(getByText('0:00'))
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          expect.stringContaining('recordings.savedSuccess'),
          'recordings.recordingSaved'
        )
      })
    })

    it('logs info before showing success notification', async () => {
      const mockSession = {
        id: 'session-123',
        recording_id: 'rec-123',
        channel_id: 'test-channel',
        started_at: new Date().toISOString(),
      }

      const mockRecording = {
        id: 'rec-123',
        duration_seconds: 120,
      }

      ;(recordingApi.startRecording as jest.Mock).mockResolvedValue(mockSession)
      ;(recordingApi.stopRecording as jest.Mock).mockResolvedValue(mockRecording)

      const { getByText } = render(<RecordButton {...defaultProps} />)

      // Start and stop recording
      fireEvent.press(getByText('recordings.record'))
      await waitFor(() => expect(recordingApi.startRecording).toHaveBeenCalled())

      fireEvent.press(getByText('0:00'))

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith(
          'Recording stopped',
          'RecordButton',
          expect.objectContaining({ recordingId: 'rec-123' })
        )
        expect(mockShowSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Error Notifications', () => {
    it('shows error notification on recording start failure', async () => {
      const error = { message: 'Network error', detail: 'Connection failed' }
      ;(recordingApi.startRecording as jest.Mock).mockRejectedValue(error)

      const { getByText } = render(<RecordButton {...defaultProps} />)

      fireEvent.press(getByText('recordings.record'))

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to start recording',
          'RecordButton',
          expect.objectContaining({ error })
        )
        expect(mockShowError).toHaveBeenCalledWith('Connection failed', 'recordings.error')
      })
    })

    it('shows error notification on recording stop failure', async () => {
      const mockSession = {
        id: 'session-123',
        recording_id: 'rec-123',
        channel_id: 'test-channel',
        started_at: new Date().toISOString(),
      }

      ;(recordingApi.startRecording as jest.Mock).mockResolvedValue(mockSession)
      ;(recordingApi.stopRecording as jest.Mock).mockRejectedValue(
        new Error('Stop failed')
      )

      const { getByText } = render(<RecordButton {...defaultProps} />)

      // Start recording
      fireEvent.press(getByText('recordings.record'))
      await waitFor(() => expect(recordingApi.startRecording).toHaveBeenCalled())

      // Try to stop (fails)
      fireEvent.press(getByText('0:00'))

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to stop recording',
          'RecordButton',
          expect.any(Object)
        )
        expect(mockShowError).toHaveBeenCalled()
      })
    })

    it('pairs logger with notifications in correct order', async () => {
      const callOrder: string[] = []

      ;(logger.error as jest.Mock).mockImplementation(() => callOrder.push('logger'))
      mockShowError.mockImplementation(() => {
        callOrder.push('notification')
        return '1'
      })

      ;(recordingApi.startRecording as jest.Mock).mockRejectedValue(
        new Error('Test error')
      )

      const { getByText } = render(<RecordButton {...defaultProps} />)

      fireEvent.press(getByText('recordings.record'))

      await waitFor(() => {
        expect(callOrder).toEqual(['logger', 'notification'])
      })
    })
  })

  describe('Premium Access', () => {
    it('shows upgrade modal for non-premium users', () => {
      const { getByText } = render(
        <RecordButton {...defaultProps} isPremium={false} />
      )

      fireEvent.press(getByText('recordings.record'))

      expect(mockOnShowUpgrade).toHaveBeenCalled()
      expect(recordingApi.startRecording).not.toHaveBeenCalled()
    })
  })

  describe('Live Status', () => {
    it('does not render when not live', () => {
      const { queryByText } = render(<RecordButton {...defaultProps} isLive={false} />)

      expect(queryByText('recordings.record')).toBeNull()
    })
  })
})
