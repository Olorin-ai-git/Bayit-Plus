import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo'
import { log } from '@bayit/shared-services/logger.native'

type NetworkChangeListener = (isConnected: boolean, connectionType: NetInfoStateType) => void

class NetworkMonitor {
  private listeners: Set<NetworkChangeListener> = new Set()
  private isConnected: boolean = true
  private connectionType: NetInfoStateType = NetInfoStateType.unknown
  private unsubscribe: (() => void) | null = null

  initialize() {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected
      this.isConnected = state.isConnected ?? false
      this.connectionType = state.type

      if (wasConnected !== this.isConnected) {
        log.info('Network connectivity changed', {
          isConnected: this.isConnected,
          type: this.connectionType,
        })

        this.listeners.forEach(listener => {
          listener(this.isConnected, this.connectionType)
        })
      }
    })

    NetInfo.fetch().then((state: NetInfoState) => {
      this.isConnected = state.isConnected ?? false
      this.connectionType = state.type
      log.info('Initial network state', {
        isConnected: this.isConnected,
        type: this.connectionType,
      })
    })
  }

  addListener(listener: NetworkChangeListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
    }
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch()
    return state.isConnected ?? false
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.listeners.clear()
  }
}

export const networkMonitor = new NetworkMonitor()
