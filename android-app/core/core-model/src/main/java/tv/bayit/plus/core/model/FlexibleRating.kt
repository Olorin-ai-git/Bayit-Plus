package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

/**
 * A rating value that can be either numeric (7.654 -> "7.7") or
 * a content rating string ("PG-13"). Backed by [FlexibleRatingSerializer]
 * to handle the polymorphic JSON from the backend.
 */
@Serializable(with = FlexibleRatingSerializer::class)
data class FlexibleRating(
    val value: String
) {
    val isNumeric: Boolean
        get() = value.toDoubleOrNull() != null

    val numericValue: Double?
        get() = value.toDoubleOrNull()

    override fun toString(): String = value
}
