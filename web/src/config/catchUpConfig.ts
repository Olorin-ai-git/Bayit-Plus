/**
 * Catch-Up Feature Configuration
 * Loads and validates AI Catch-Up summary settings from environment variables.
 */

import { logger } from '@/utils/logger'

const log = logger.scope('CatchUpConfig')

interface CatchUpConfig {
  enabled: boolean
  creditCost: number
  autoDismissSeconds: number
  defaultWindowMinutes: number
  autoTriggerMinutes: number
}

function loadCatchUpConfig(): CatchUpConfig {
  const enabled = import.meta.env.VITE_CATCHUP_ENABLED !== 'false'
  const creditCost = parseInt(import.meta.env.VITE_CATCHUP_CREDIT_COST || '5', 10)
  const autoDismissSeconds = parseInt(import.meta.env.VITE_CATCHUP_AUTO_DISMISS_SECONDS || '22', 10)
  const defaultWindowMinutes = parseInt(import.meta.env.VITE_CATCHUP_DEFAULT_WINDOW_MINUTES || '15', 10)
  const autoTriggerMinutes = parseInt(import.meta.env.VITE_CATCHUP_AUTO_TRIGGER_MINUTES || '5', 10)

  const config: CatchUpConfig = {
    enabled,
    creditCost: Math.max(1, creditCost),
    autoDismissSeconds: Math.max(5, Math.min(60, autoDismissSeconds)),
    defaultWindowMinutes: Math.max(1, Math.min(30, defaultWindowMinutes)),
    autoTriggerMinutes: Math.max(1, Math.min(30, autoTriggerMinutes)),
  }

  if (enabled) {
    log.info('Catch-Up feature enabled', {
      creditCost: config.creditCost,
      autoDismissSeconds: config.autoDismissSeconds,
      defaultWindowMinutes: config.defaultWindowMinutes,
    })
  }

  return config
}

export const catchUpConfig = loadCatchUpConfig()
