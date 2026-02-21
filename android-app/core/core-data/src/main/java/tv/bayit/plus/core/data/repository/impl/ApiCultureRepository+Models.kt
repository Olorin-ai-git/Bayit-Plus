package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

internal interface CultureService {

    @GET("api/v1/cultures")
    suspend fun getCultures(): List<CultureItem>

    @GET("api/v1/cultures/default")
    suspend fun getDefaultCulture(): CultureItem

    @GET("api/v1/cultures/{cultureId}/featured")
    suspend fun getCultureFeatured(
        @Path("cultureId") cultureId: String,
    ): CultureFeaturedResponse

    @GET("api/v1/cultures/{cultureId}/trending")
    suspend fun getCultureTrending(
        @Path("cultureId") cultureId: String,
        @Query("limit") limit: Int = 10,
    ): List<CultureContentItem>

    @GET("api/v1/cultures/{cultureId}/time")
    suspend fun getCultureTime(
        @Path("cultureId") cultureId: String,
    ): CultureTimeResponse

    @GET("api/v1/judaism/shabbat/featured")
    suspend fun getShabbatFeatured(): ShabbatFeaturedResponse

    @GET("api/v1/cultures/city/{citySlug}/content")
    suspend fun getCityContent(
        @Path("citySlug") citySlug: String,
    ): List<CultureContentItem>
}

@Serializable
internal data class CultureItem(
    val id: String,
    val name: String? = null,
    @SerialName("name_en") val nameEn: String? = null,
    @SerialName("name_he") val nameHe: String? = null,
    val description: String? = null,
    val timezone: String? = null,
    @SerialName("is_active") val isActive: Boolean? = null,
    @SerialName("display_order") val displayOrder: Int? = null,
)

@Serializable
internal data class CultureFeaturedResponse(
    val hero: CultureHeroItem? = null,
    val sections: List<CultureSection> = emptyList(),
)

@Serializable
internal data class CultureHeroItem(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
)

@Serializable
internal data class CultureSection(
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val items: List<CultureContentItem> = emptyList(),
)

@Serializable
internal data class CultureContentItem(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val category: String? = null,
    val type: String? = null,
)

@Serializable
internal data class CultureTimeResponse(
    @SerialName("formatted_time") val formattedTime: String? = null,
    @SerialName("formatted_date") val formattedDate: String? = null,
    @SerialName("day_of_week") val dayOfWeek: String? = null,
    val timezone: String? = null,
    @SerialName("is_weekend") val isWeekend: Boolean? = null,
    @SerialName("hebrew_date") val hebrewDate: String? = null,
)

@Serializable
internal data class ShabbatFeaturedResponse(
    val parasha: String? = null,
    @SerialName("parasha_he") val parashaHe: String? = null,
    @SerialName("is_shabbat") val isShabbat: Boolean? = null,
    val sections: ShabbatSections? = null,
    @SerialName("all_content") val allContent: List<ShabbatContentItem> = emptyList(),
)

@Serializable
internal data class ShabbatSections(
    @SerialName("parasha_content") val parashaContent: List<ShabbatContentItem> = emptyList(),
    @SerialName("shabbat_music") val shabbatMusic: List<ShabbatContentItem> = emptyList(),
    val preparation: List<ShabbatContentItem> = emptyList(),
    val featured: List<ShabbatContentItem> = emptyList(),
)

@Serializable
internal data class ShabbatContentItem(
    val id: String? = null,
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val rabbi: String? = null,
    val category: String? = null,
    val type: String? = null,
)
