package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.Locale

/** Item from GET /api/v1/content/collections (array response). */
@Serializable
data class CollectionListItem(
    val id: String,
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    @SerialName("promo_text") val promoText: String? = null,
    @SerialName("promo_text_en") val promoTextEn: String? = null,
    @SerialName("available_movies") val availableMovies: Int = 0,
    @SerialName("total_movies") val totalMovies: Int = 0,
    @SerialName("tmdb_collection_id") val tmdbCollectionId: Int? = null,
) {
    /** Returns localized promo text based on device locale, falling back to English then Hebrew. */
    fun localizedPromoText(): String? {
        val lang = Locale.getDefault().language
        val localized: String? = if (lang == "he") promoText else promoTextEn
        return localized ?: promoTextEn ?: promoText
    }

    /** Convert to [ContentItem] for display in the VOD grid. */
    fun toContentItem(): ContentItem = ContentItem(
        id = id,
        title = title,
        description = localizedPromoText(),
        thumbnail = thumbnail,
        backdrop = backdrop,
        type = "collection",
        isCollectionParent = true,
        availableMovies = availableMovies,
        totalMovies = totalMovies,
    )
}

/** Response from GET /api/v1/content/collections/{id} */
@Serializable
data class CollectionDetail(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    @SerialName("available_movies") val availableMovies: Int? = null,
    @SerialName("total_movies") val totalMovies: Int? = null,
    @SerialName("promo_text") val promoText: String? = null,
    @SerialName("promo_text_en") val promoTextEn: String? = null,
    @SerialName("promo_text_es") val promoTextEs: String? = null,
    @SerialName("promo_text_fr") val promoTextFr: String? = null,
    @SerialName("promo_text_it") val promoTextIt: String? = null,
    @SerialName("promo_text_hi") val promoTextHi: String? = null,
    @SerialName("promo_text_ta") val promoTextTa: String? = null,
    @SerialName("promo_text_bn") val promoTextBn: String? = null,
    @SerialName("promo_text_ja") val promoTextJa: String? = null,
    @SerialName("promo_text_zh") val promoTextZh: String? = null,
    val movies: List<CollectionMovie> = emptyList(),
) {
    /** Returns localized promo text based on device locale, with fallback chain. */
    fun localizedPromoText(): String? {
        val lang = Locale.getDefault().language
        val localized: String? = when (lang) {
            "he" -> promoText
            "en" -> promoTextEn
            "es" -> promoTextEs
            "fr" -> promoTextFr
            "it" -> promoTextIt
            "hi" -> promoTextHi
            "ta" -> promoTextTa
            "bn" -> promoTextBn
            "ja" -> promoTextJa
            "zh" -> promoTextZh
            else -> promoTextEn
        }
        return localized ?: promoTextEn ?: promoText
    }
}

/** Movie within a collection. */
@Serializable
data class CollectionMovie(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    val year: Int? = null,
    val duration: String? = null,
    @SerialName("collection_order") val collectionOrder: Int? = null,
)
