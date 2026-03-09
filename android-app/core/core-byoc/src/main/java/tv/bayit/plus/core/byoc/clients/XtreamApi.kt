package tv.bayit.plus.core.byoc.clients

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class XtreamAuthResponse(
    @SerialName("user_info") val userInfo: XtreamUserInfo,
    @SerialName("server_info") val serverInfo: XtreamServerInfo,
)

@Serializable
data class XtreamUserInfo(
    val username: String,
    val status: String,
    @SerialName("exp_date") val expDate: String? = null,
    @SerialName("max_connections") val maxConnections: String = "1",
    @SerialName("active_cons") val activeCons: String = "0",
)

@Serializable
data class XtreamServerInfo(
    val url: String = "",
    val port: String = "",
)

@Serializable
data class XtreamStreamItem(
    @SerialName("stream_id") val streamId: Long,
    val name: String,
    @SerialName("stream_icon") val streamIcon: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("container_extension") val containerExtension: String? = null,
)

@Serializable
data class XtreamSeriesItem(
    @SerialName("series_id") val seriesId: Long,
    val name: String,
    val cover: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
)
