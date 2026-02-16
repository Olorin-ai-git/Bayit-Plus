package tv.bayit.plus.core.model

/**
 * Layout mode for split/dual subtitles.
 *
 * Mirrors the tvOS SplitSubtitleLayout enum to provide consistent
 * dual-language subtitle viewing experience.
 */
enum class SplitSubtitleLayout {
    /** Primary subtitle on top, secondary subtitle below (vertically stacked) */
    STACKED,

    /** Left and right columns (horizontally split) */
    SIDE_BY_SIDE;

    val label: String
        get() = when (this) {
            STACKED -> "Stacked"
            SIDE_BY_SIDE -> "Side by Side"
        }

    val icon: String
        get() = when (this) {
            STACKED -> "text_fields"  // Material icon for stacked text
            SIDE_BY_SIDE -> "view_column"  // Material icon for columns
        }

    val description: String
        get() = when (this) {
            STACKED -> "Primary on top, secondary below"
            SIDE_BY_SIDE -> "Left and right columns"
        }
}
