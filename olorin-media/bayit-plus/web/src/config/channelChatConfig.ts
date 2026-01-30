/**
 * Channel Chat Configuration
 * Loads and validates live chat settings from environment variables.
 */

import { logger } from '@/utils/logger'

const log = logger.scope('ChannelChatConfig')

interface ChannelChatConfig {
  maxMessageLength: number
  autoHideMs: number
  maxMessages: number
  maxRetries: number
  baseDelay: number
  maxDelay: number
  lowBalanceThreshold: number
}

function loadChannelChatConfig(): ChannelChatConfig {
  const maxMessageLength = parseInt(import.meta.env.VITE_CHAT_MAX_MESSAGE_LENGTH || '280', 10)
  const autoHideMs = parseInt(import.meta.env.VITE_CHAT_AUTO_HIDE_MS || '10000', 10)
  const maxMessages = parseInt(import.meta.env.VITE_CHAT_MAX_MESSAGES || '200', 10)
  const maxRetries = parseInt(import.meta.env.VITE_CHAT_MAX_RETRIES || '5', 10)
  const baseDelay = parseInt(import.meta.env.VITE_CHAT_BASE_DELAY || '1000', 10)
  const maxDelay = parseInt(import.meta.env.VITE_CHAT_MAX_DELAY || '30000', 10)
  const lowBalanceThreshold = parseInt(import.meta.env.VITE_LOW_BALANCE_THRESHOLD || '10', 10)

  const config: ChannelChatConfig = {
    maxMessageLength: Math.max(1, Math.min(2000, maxMessageLength)),
    autoHideMs: Math.max(1000, Math.min(60000, autoHideMs)),
    maxMessages: Math.max(50, Math.min(1000, maxMessages)),
    maxRetries: Math.max(1, Math.min(20, maxRetries)),
    baseDelay: Math.max(500, Math.min(10000, baseDelay)),
    maxDelay: Math.max(5000, Math.min(120000, maxDelay)),
    lowBalanceThreshold: Math.max(1, Math.min(100, lowBalanceThreshold)),
  }

  log.info('Channel Chat configuration loaded', config)
  return config
}

export const channelChatConfig = loadChannelChatConfig()
