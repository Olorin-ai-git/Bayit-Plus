package tv.bayit.plus.core.byoc.clients

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface PlexApi {

    @POST("api/v2/pins")
    suspend fun requestPin(
        @Query("strong") strong: Boolean = false,
        @Header("Accept") accept: String = "application/json",
        @Header("X-Plex-Product") product: String,
        @Header("X-Plex-Client-Identifier") clientId: String,
    ): PlexPinResponse

    @GET("api/v2/pins/{id}")
    suspend fun checkPin(
        @Path("id") pinId: Long,
        @Header("Accept") accept: String = "application/json",
        @Header("X-Plex-Client-Identifier") clientId: String,
    ): PlexPinResponse

    @GET("api/v2/resources")
    suspend fun discoverServers(
        @Header("Accept") accept: String = "application/json",
        @Header("X-Plex-Token") token: String,
        @Header("X-Plex-Client-Identifier") clientId: String,
    ): List<PlexResourceResponse>
}

interface PlexServerApi {

    @GET("library/sections")
    suspend fun fetchLibraries(
        @Header("Accept") accept: String = "application/json",
        @Header("X-Plex-Token") token: String,
    ): PlexLibrariesContainer

    @GET("library/sections/{libraryId}/all")
    suspend fun fetchLibraryItems(
        @Path("libraryId") libraryId: String,
        @Header("Accept") accept: String = "application/json",
        @Header("X-Plex-Token") token: String,
    ): PlexItemsContainer
}

@Serializable
data class PlexPinResponse(
    val id: Long,
    val code: String,
    val authToken: String? = null,
    @SerialName("product") val product: String? = null,
    @SerialName("client_identifier") val clientIdentifier: String? = null,
)

@Serializable
data class PlexResourceResponse(
    val name: String,
    @SerialName("clientIdentifier") val clientId: String,
    val owned: Boolean = false,
    val connections: List<PlexConnectionResponse> = emptyList(),
    val provides: String = "",
)

@Serializable
data class PlexConnectionResponse(
    val uri: String,
    val local: Boolean = false,
)

@Serializable
data class PlexLibrariesContainer(
    @SerialName("MediaContainer") val container: PlexLibrariesMediaContainer,
)

@Serializable
data class PlexLibrariesMediaContainer(
    @SerialName("Directory") val directories: List<PlexLibraryDirectory> = emptyList(),
)

@Serializable
data class PlexLibraryDirectory(
    val key: String,
    val title: String,
    val type: String,
)

@Serializable
data class PlexItemsContainer(
    @SerialName("MediaContainer") val container: PlexItemsMediaContainer,
)

@Serializable
data class PlexItemsMediaContainer(
    @SerialName("Metadata") val metadata: List<PlexMetadataItem> = emptyList(),
)

@Serializable
data class PlexMetadataItem(
    val ratingKey: String,
    val title: String,
    val summary: String? = null,
    val thumb: String? = null,
    val art: String? = null,
    val duration: Long? = null,
    val year: Int? = null,
    val type: String = "",
    @SerialName("Media") val media: List<PlexMediaItem> = emptyList(),
    @SerialName("Guid") val guids: List<PlexGuid> = emptyList(),
)

@Serializable
data class PlexGuid(
    val id: String,
)

@Serializable
data class PlexMediaItem(
    @SerialName("Part") val parts: List<PlexMediaPart> = emptyList(),
)

@Serializable
data class PlexMediaPart(
    val key: String,
)
