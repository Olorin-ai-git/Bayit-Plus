package tv.bayit.plus.core.cast.models

data class CastMedia(
    val contentId: String,
    val title: String,
    val streamUrl: String,
    val posterUrl: String?,
    val duration: Long?,
    val subtitleTracks: List<CastSubtitleTrack>,
    val contentType: String,
)
