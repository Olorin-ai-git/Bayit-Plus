package tv.bayit.plus.core.model

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull

/**
 * Custom serializer for [FlexibleRating].
 *
 * The backend rating field can arrive as either a numeric value (7.654)
 * or a string ("PG-13"). This serializer handles both formats and
 * normalizes numeric values to one decimal place.
 */
object FlexibleRatingSerializer : KSerializer<FlexibleRating> {

    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleRating", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): FlexibleRating {
        val jsonDecoder = decoder as? JsonDecoder
            ?: return FlexibleRating(decoder.decodeString())

        val element = jsonDecoder.decodeJsonElement()
        if (element is JsonPrimitive) {
            val doubleValue = element.doubleOrNull
            if (doubleValue != null) {
                return FlexibleRating(String.format("%.1f", doubleValue))
            }
            return FlexibleRating(element.content)
        }
        return FlexibleRating("")
    }

    override fun serialize(encoder: Encoder, value: FlexibleRating) {
        encoder.encodeString(value.value)
    }
}
