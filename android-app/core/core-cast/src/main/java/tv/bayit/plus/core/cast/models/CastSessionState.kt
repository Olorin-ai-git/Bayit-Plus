package tv.bayit.plus.core.cast.models

enum class CastSessionState {
    NO_DEVICES_AVAILABLE,
    NOT_CONNECTED,
    CONNECTING,
    CONNECTED,
    DISCONNECTING;

    val isAvailable: Boolean get() = this != NO_DEVICES_AVAILABLE
    val isConnecting: Boolean get() = this == CONNECTING
    val isConnected: Boolean get() = this == CONNECTED
}
