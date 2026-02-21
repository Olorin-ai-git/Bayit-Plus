package tv.bayit.plus.feature.home

import java.util.Locale
import java.util.TimeZone

private val canadianTimezones = setOf(
    "America/Toronto",
    "America/Vancouver",
    "America/Montreal",
    "America/Halifax",
    "America/Winnipeg",
    "America/Edmonton",
    "America/Whitehorse",
    "America/Yellowknife",
    "America/Regina",
    "America/Moncton",
    "America/St_Johns",
)

internal fun timezoneDisplayFlag(timezoneId: String): String = when {
    timezoneId in canadianTimezones -> "\uD83C\uDDE8\uD83C\uDDE6"
    timezoneId.startsWith("America/") || timezoneId.startsWith("US/") -> "\uD83C\uDDFA\uD83C\uDDF8"
    timezoneId == "Europe/London" || timezoneId == "GB" -> "\uD83C\uDDEC\uD83C\uDDE7"
    timezoneId == "Asia/Jerusalem" || timezoneId == "Asia/Tel_Aviv" -> "\uD83C\uDDEE\uD83C\uDDF1"
    timezoneId == "Asia/Dubai" || timezoneId == "Asia/Muscat" -> "\uD83C\uDDE6\uD83C\uDDEA"
    timezoneId.startsWith("Australia/") -> "\uD83C\uDDE6\uD83C\uDDFA"
    timezoneId.startsWith("Europe/") -> "\uD83C\uDDEA\uD83C\uDDFA"
    else -> "\uD83C\uDF0D"
}

internal fun timezoneDisplayCity(timezoneId: String): String = when (timezoneId) {
    "America/New_York", "America/Detroit",
    "America/Indiana/Indianapolis", "America/Indiana/Marengo",
    "America/Kentucky/Louisville", "America/Kentucky/Monticello" -> "New York, NY"
    "America/Chicago", "America/Menominee",
    "America/Indiana/Knox", "America/Indiana/Tell_City" -> "Chicago, IL"
    "America/Denver", "America/Boise",
    "America/North_Dakota/Center", "America/North_Dakota/New_Salem" -> "Denver, CO"
    "America/Los_Angeles" -> "Los Angeles, CA"
    "America/Phoenix" -> "Phoenix, AZ"
    "America/Anchorage", "America/Juneau", "America/Sitka",
    "America/Yakutat", "America/Nome" -> "Anchorage, AK"
    "Pacific/Honolulu", "America/Adak" -> "Honolulu, HI"
    "America/Toronto", "America/Montreal",
    "America/Iqaluit", "America/Nipigon", "America/Thunder_Bay" -> "Toronto, ON"
    "America/Vancouver", "America/Whitehorse" -> "Vancouver, BC"
    "America/Edmonton", "America/Yellowknife", "America/Cambridge_Bay" -> "Calgary, AB"
    "America/Winnipeg", "America/Rankin_Inlet", "America/Resolute" -> "Winnipeg, MB"
    "America/Halifax", "America/Glace_Bay", "America/Moncton", "America/Goose_Bay" -> "Halifax, NS"
    "America/St_Johns" -> "St. John's, NL"
    "America/Regina", "America/Swift_Current" -> "Regina, SK"
    "Europe/London", "GB" -> "London, UK"
    "Europe/Paris" -> "Paris, FR"
    "Europe/Berlin" -> "Berlin, DE"
    "Europe/Rome" -> "Rome, IT"
    "Europe/Madrid" -> "Madrid, ES"
    "Europe/Amsterdam" -> "Amsterdam, NL"
    "Europe/Moscow" -> "Moscow, RU"
    "Asia/Jerusalem", "Asia/Tel_Aviv" -> "Tel Aviv, IL"
    "Asia/Dubai", "Asia/Muscat" -> "Dubai, UAE"
    "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane" -> "Sydney, AU"
    "Australia/Perth" -> "Perth, AU"
    else -> TimeZone.getTimeZone(timezoneId).getDisplayName(false, TimeZone.SHORT, Locale.getDefault())
}
