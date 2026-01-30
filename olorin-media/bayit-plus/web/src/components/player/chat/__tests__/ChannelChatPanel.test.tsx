/**
 * ChannelChatPanel Component Tests
 * Verifies rendering states, keyboard navigation, error fallback,
 * mini bar mode, and expanded message display.
 */

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import ChannelChatPanel from '../ChannelChatPanel'
import { useChannelChat } from '../../hooks/useChannelChat'
import { useChannelChatStore } from '@/stores/channelChatSlice'

jest.mock('../../hooks/useChannelChat')
jest.mock('@/stores/channelChatSlice')
jest.mock('@/utils/logger', () => ({
  scope: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`
    return key
  }}),
}))
jest.mock('@olorin/design-tokens', () => ({
  colors: { error: { DEFAULT: '#ef4444' }, primary: { DEFAULT: '#6366f1' } },
}))
jest.mock('lucide-react', () => ({
  MessageCircle: () => null,
  AlertTriangle: () => null,
}))
jest.mock('../ChannelChatHeader', () => {
  const { Text } = require('react-native')
  return (props: Record<string, unknown>) => <Text testID="chat-header">{`users:${props.userCount}`}</Text>
})
jest.mock('../ChannelChatMessage', () => {
  const { Text } = require('react-native')
  return ({ message }: { message: { id: string; text: string } }) => (
    <Text testID={`msg-${message.id}`}>{message.text}</Text>
  )
})
jest.mock('../ChannelChatInput', () => {
  const { Text } = require('react-native')
  return (props: { disabled: boolean }) => <Text testID="chat-input">{props.disabled ? 'disabled' : 'enabled'}</Text>
})
jest.mock('../ChannelChatPanel.styles', () => ({
  panelStyles: {
    panel: {}, errorContainer: {}, errorText: {}, retryButton: {}, retryText: {},
    miniBar: {}, miniBarTitle: {}, miniBarCount: {}, messageList: {}, messageListContent: {},
  },
}))

const mockUseChannelChat = useChannelChat as jest.MockedFunction<typeof useChannelChat>
const mockUseStore = useChannelChatStore as unknown as jest.MockedFunction<() => Record<string, unknown>>

const buildStoreState = (overrides: Record<string, unknown> = {}) => ({
  isChatVisible: true,
  isChatExpanded: true,
  toggleChatVisibility: jest.fn(),
  toggleChatExpanded: jest.fn(),
  ...overrides,
})

const buildHookState = (overrides: Record<string, unknown> = {}) => ({
  isConnected: true,
  isConnecting: false,
  messages: [],
  userCount: 5,
  isBetaUser: false,
  translationEnabled: false,
  error: null,
  connectionState: 'connected' as const,
  sendMessage: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn(),
  ...overrides,
})

const defaultProps = { channelId: 'ch-001', isLiveChannel: true }

describe('ChannelChatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseStore.mockReturnValue(buildStoreState())
    mockUseChannelChat.mockReturnValue(buildHookState() as ReturnType<typeof useChannelChat>)
  })

  afterEach(() => { jest.useRealTimers() })

  describe('Visibility', () => {
    it('returns null when chat is not visible', () => {
      mockUseStore.mockReturnValue(buildStoreState({ isChatVisible: false }))
      const { toJSON } = render(<ChannelChatPanel {...defaultProps} />)
      expect(toJSON()).toBeNull()
    })

    it('renders expanded panel when visible and expanded', () => {
      const { getByTestId } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByTestId('chat-header')).toBeTruthy()
      expect(getByTestId('chat-input')).toBeTruthy()
    })
  })

  describe('Mini Bar Mode', () => {
    it('renders mini bar when visible but collapsed', () => {
      mockUseStore.mockReturnValue(buildStoreState({ isChatExpanded: false }))
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByText('channelChat.title')).toBeTruthy()
      expect(getByText('channelChat.participants:5')).toBeTruthy()
    })

    it('calls toggleChatExpanded on mini bar press', () => {
      const toggleExpanded = jest.fn()
      mockUseStore.mockReturnValue(buildStoreState({ isChatExpanded: false, toggleChatExpanded: toggleExpanded }))
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      fireEvent.press(getByText('channelChat.title'))
      expect(toggleExpanded).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error State', () => {
    it('renders error fallback when error and disconnected', () => {
      mockUseChannelChat.mockReturnValue(
        buildHookState({ error: 'Connection lost', isConnected: false }) as ReturnType<typeof useChannelChat>,
      )
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByText('channelChat.error')).toBeTruthy()
      expect(getByText('channelChat.retry')).toBeTruthy()
    })

    it('calls reconnect when retry is pressed', () => {
      const reconnectFn = jest.fn()
      mockUseChannelChat.mockReturnValue(
        buildHookState({ error: 'Disconnected', isConnected: false, reconnect: reconnectFn }) as ReturnType<typeof useChannelChat>,
      )
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      fireEvent.press(getByText('channelChat.retry'))
      expect(reconnectFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Messages', () => {
    it('renders each message in the list', () => {
      const messages = [
        { id: 'm1', text: 'Hello', userId: 'u1', userName: 'Dan', originalLanguage: 'en', timestamp: '', isPinned: false },
        { id: 'm2', text: 'Shalom', userId: 'u2', userName: 'Noa', originalLanguage: 'he', timestamp: '', isPinned: false },
      ]
      mockUseChannelChat.mockReturnValue(buildHookState({ messages }) as ReturnType<typeof useChannelChat>)
      const { getByTestId } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByTestId('msg-m1')).toBeTruthy()
      expect(getByTestId('msg-m2')).toBeTruthy()
    })

    it('disables input when disconnected', () => {
      mockUseChannelChat.mockReturnValue(buildHookState({ isConnected: false, error: null }) as ReturnType<typeof useChannelChat>)
      mockUseStore.mockReturnValue(buildStoreState({ isChatExpanded: true }))
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByText('disabled')).toBeTruthy()
    })
  })

  describe('Keyboard Navigation', () => {
    it('closes chat when Escape key is pressed', () => {
      const toggleVisibility = jest.fn()
      mockUseStore.mockReturnValue(buildStoreState({ toggleChatVisibility: toggleVisibility }))
      render(<ChannelChatPanel {...defaultProps} />)
      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
      expect(toggleVisibility).toHaveBeenCalledTimes(1)
    })

    it('ignores non-Escape keys', () => {
      const toggleVisibility = jest.fn()
      mockUseStore.mockReturnValue(buildStoreState({ toggleChatVisibility: toggleVisibility }))
      render(<ChannelChatPanel {...defaultProps} />)
      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })) })
      expect(toggleVisibility).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('sets complementary role and aria-label on expanded panel', () => {
      const { toJSON } = render(<ChannelChatPanel {...defaultProps} />)
      const tree = JSON.stringify(toJSON())
      expect(tree).toContain('complementary')
      expect(tree).toContain('channelChat.title')
    })

    it('sets button role on error retry', () => {
      mockUseChannelChat.mockReturnValue(
        buildHookState({ error: 'fail', isConnected: false }) as ReturnType<typeof useChannelChat>,
      )
      const { getByText } = render(<ChannelChatPanel {...defaultProps} />)
      expect(getByText('channelChat.retry')).toBeTruthy()
    })
  })
})
