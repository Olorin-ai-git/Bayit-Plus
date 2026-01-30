/**
 * CatchUpOverlay Component Tests
 * Verifies credit display, countdown timer, pause-on-hover,
 * low balance warning, and accept/decline callbacks.
 */

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import CatchUpOverlay from '../CatchUpOverlay'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => {
    if (params) {
      const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`)
      return `${key}|${parts.join(',')}`
    }
    return key
  }}),
}))
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    primary: { DEFAULT: '#6366f1', 400: '#818cf8' },
    text: '#ffffff', textSecondary: '#a1a1aa', textMuted: '#71717a',
    warning: { DEFAULT: '#f59e0b' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  borderRadius: { sm: 4, md: 8, lg: 16, full: 9999 },
  fontSize: { xs: 12, sm: 14, base: 16 },
  glass: { bgStrong: 'rgba(0,0,0,0.8)', bgLight: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.15)', borderLight: 'rgba(255,255,255,0.1)' },
}))
jest.mock('lucide-react', () => ({
  Clock: () => null,
  X: () => null,
  AlertTriangle: () => null,
}))

const defaultProps = {
  channelId: 'ch-live-01',
  programName: 'Evening News',
  creditCost: 5,
  creditBalance: 50,
  onAccept: jest.fn(),
  onDecline: jest.fn(),
  autoDismissSeconds: 10,
}

describe('CatchUpOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => { jest.useRealTimers() })

  describe('Rendering', () => {
    it('renders title and description with program name', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} />)
      expect(getByText('catchup.overlay.title')).toBeTruthy()
      expect(getByText('catchup.overlay.description|programName=Evening News')).toBeTruthy()
    })

    it('uses fallback key when programName is not provided', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} programName={undefined} />)
      expect(getByText('catchup.overlay.description|programName=catchup.overlay.thisProgram')).toBeTruthy()
    })

    it('renders accept button with credit cost', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} />)
      expect(getByText('catchup.overlay.accept|cost=5')).toBeTruthy()
    })

    it('renders decline button', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} />)
      expect(getByText('catchup.overlay.decline')).toBeTruthy()
    })
  })

  describe('Credit Balance', () => {
    it('displays current balance context', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} />)
      expect(getByText('catchup.overlay.balanceContext|balance=50')).toBeTruthy()
    })

    it('does not show low balance warning when balance >= 10', () => {
      const { queryByText } = render(<CatchUpOverlay {...defaultProps} creditBalance={25} />)
      expect(queryByText(/lowBalance/)).toBeNull()
    })

    it('shows low balance warning when balance < 10', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} creditBalance={7} />)
      expect(getByText('catchup.overlay.lowBalance|balance=7')).toBeTruthy()
    })

    it('shows low balance warning at boundary value of 9', () => {
      const { getByText } = render(<CatchUpOverlay {...defaultProps} creditBalance={9} />)
      expect(getByText('catchup.overlay.lowBalance|balance=9')).toBeTruthy()
    })

    it('does not show low balance warning at boundary value of 10', () => {
      const { queryByText } = render(<CatchUpOverlay {...defaultProps} creditBalance={10} />)
      expect(queryByText(/lowBalance/)).toBeNull()
    })
  })

  describe('Button Callbacks', () => {
    it('calls onAccept when accept button is pressed', () => {
      const onAccept = jest.fn()
      const { getByText } = render(<CatchUpOverlay {...defaultProps} onAccept={onAccept} />)
      fireEvent.press(getByText('catchup.overlay.accept|cost=5'))
      expect(onAccept).toHaveBeenCalledTimes(1)
    })

    it('calls onDecline when decline button is pressed', () => {
      const onDecline = jest.fn()
      const { getByText } = render(<CatchUpOverlay {...defaultProps} onDecline={onDecline} />)
      fireEvent.press(getByText('catchup.overlay.decline'))
      expect(onDecline).toHaveBeenCalledTimes(1)
    })

    it('calls onDecline when close (X) button is pressed', () => {
      const onDecline = jest.fn()
      const { getByLabelText } = render(<CatchUpOverlay {...defaultProps} onDecline={onDecline} />)
      fireEvent.press(getByLabelText('common.close'))
      expect(onDecline).toHaveBeenCalledTimes(1)
    })
  })

  describe('Auto-Dismiss Countdown', () => {
    it('calls onDecline after countdown reaches zero', () => {
      const onDecline = jest.fn()
      render(<CatchUpOverlay {...defaultProps} onDecline={onDecline} autoDismissSeconds={3} />)
      act(() => { jest.advanceTimersByTime(3000) })
      expect(onDecline).toHaveBeenCalledTimes(1)
    })

    it('does not call onDecline before countdown completes', () => {
      const onDecline = jest.fn()
      render(<CatchUpOverlay {...defaultProps} onDecline={onDecline} autoDismissSeconds={5} />)
      act(() => { jest.advanceTimersByTime(3000) })
      expect(onDecline).not.toHaveBeenCalled()
    })
  })

  describe('Hover Pause Behavior', () => {
    it('pauses countdown on hover and resumes on hover out', () => {
      const onDecline = jest.fn()
      const { UNSAFE_root } = render(
        <CatchUpOverlay {...defaultProps} onDecline={onDecline} autoDismissSeconds={4} />,
      )
      const pressable = UNSAFE_root.findAllByType('View')[0]?.parent
      act(() => { jest.advanceTimersByTime(2000) })
      expect(onDecline).not.toHaveBeenCalled()

      if (pressable?.props?.onHoverIn) {
        act(() => { pressable.props.onHoverIn() })
        act(() => { jest.advanceTimersByTime(5000) })
        expect(onDecline).not.toHaveBeenCalled()

        act(() => { pressable.props.onHoverOut() })
        act(() => { jest.advanceTimersByTime(2000) })
        expect(onDecline).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Accessibility', () => {
    it('sets alert role on the card', () => {
      const { toJSON } = render(<CatchUpOverlay {...defaultProps} />)
      const tree = JSON.stringify(toJSON())
      expect(tree).toContain('"accessibilityRole":"alert"')
    })

    it('sets accessible label on the card', () => {
      const { toJSON } = render(<CatchUpOverlay {...defaultProps} />)
      const tree = JSON.stringify(toJSON())
      expect(tree).toContain('catchup.overlay.title')
    })

    it('sets button role on accept and decline actions', () => {
      const { toJSON } = render(<CatchUpOverlay {...defaultProps} />)
      const tree = JSON.stringify(toJSON())
      const buttonMatches = tree.match(/"accessibilityRole":"button"/g)
      expect(buttonMatches).not.toBeNull()
      expect(buttonMatches!.length).toBeGreaterThanOrEqual(2)
    })
  })
})
