package tv.bayit.plus.core.byoc.models

data class XtreamAccountInfo(
    val username: String,
    val status: String,
    val expirationDate: Long,
    val maxConnections: Int,
    val activeConnections: Int,
)
