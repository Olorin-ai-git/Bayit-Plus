package tv.bayit.plus.core.byoc.models

data class PlexServer(
    val id: String,
    val name: String,
    val host: String,
    val port: Int,
    val isLocal: Boolean,
    val isOwned: Boolean,
)

data class PlexLibrary(
    val id: String,
    val title: String,
    val type: String,
)

data class PlexDeviceCode(
    val id: Long,
    val code: String,
    val productName: String,
    val clientIdentifier: String,
)
