package tv.bayit.plus.core.voice

import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.concurrent.CopyOnWriteArrayList
import javax.inject.Inject
import javax.inject.Singleton

data class VoiceCommandPattern(
    val id: String,
    val intentType: VoiceIntentType,
    val patterns: List<Regex>,
    val actionType: String,
    val priority: Int,
)

data class VoiceCommandMatch(
    val pattern: VoiceCommandPattern,
    val confidence: Float,
    val matchedText: String,
    val extractedParams: Map<String, String>,
)

@Singleton
class VoiceCommandRegistry @Inject constructor(
    private val logger: BayitLogger,
) {
    private val commandPatterns: CopyOnWriteArrayList<VoiceCommandPattern> =
        CopyOnWriteArrayList(builtInPatterns())

    fun match(transcript: String, language: String): VoiceCommandMatch? {
        val normalized = normalizeTranscript(transcript, language)
        if (normalized.isBlank()) return null

        val matches = commandPatterns.mapNotNull { pattern ->
            findBestRegexMatch(pattern, normalized)
        }

        return matches.maxByOrNull { it.pattern.priority * it.confidence }?.also {
            logger.debug(
                "Voice command matched",
                mapOf(
                    "intent" to it.pattern.intentType.name,
                    "action" to it.pattern.actionType,
                    "confidence" to it.confidence.toString(),
                    "language" to language,
                ),
            )
        }
    }

    fun registerPattern(pattern: VoiceCommandPattern) {
        commandPatterns.add(pattern)
        logger.info(
            "Voice command pattern registered",
            mapOf("id" to pattern.id, "intent" to pattern.intentType.name),
        )
    }

    private fun normalizeTranscript(transcript: String, language: String): String =
        when (language) {
            "he" -> transcript.trim()
            else -> transcript.trim().lowercase()
        }

    private fun findBestRegexMatch(
        pattern: VoiceCommandPattern,
        normalized: String,
    ): VoiceCommandMatch? {
        for (regex in pattern.patterns) {
            val result = regex.find(normalized) ?: continue
            val params = extractParams(result)
            val coverage = result.value.length.toFloat() / normalized.length.toFloat()
            val confidence = (coverage * COVERAGE_WEIGHT + BASELINE_CONFIDENCE).coerceAtMost(MAX_CONFIDENCE)
            return VoiceCommandMatch(pattern, confidence, result.value, params)
        }
        return null
    }

    private fun extractParams(matchResult: MatchResult): Map<String, String> {
        val params = mutableMapOf<String, String>()
        matchResult.groups.forEachIndexed { index, group ->
            if (index > 0 && group != null) {
                params["group$index"] = group.value
            }
        }
        return params
    }

    companion object {
        private const val COVERAGE_WEIGHT = 0.4f
        private const val BASELINE_CONFIDENCE = 0.55f
        private const val MAX_CONFIDENCE = 0.99f

        private fun builtInPatterns(): List<VoiceCommandPattern> = listOf(
            // -- Playback (priority 10) --
            playback("pb_play", "play", 10, "play", "nagen", "reproducir"),
            playback("pb_pause", "pause", 10, "pause", "hashhe", "pausar"),
            playback("pb_stop", "stop", 10, "stop", "atsor", "detener"),
            playback("pb_resume", "resume", 10, "resume", "hamshekh", "continuar"),
            playback("pb_rewind", "rewind", 10, "rewind", "harats akhora", "rebobinar"),
            playback("pb_ff", "fast_forward", 10, "fast forward", "harats kadima", "avanzar"),
            // Hebrew-script playback
            VoiceCommandPattern("pb_he_play", VoiceIntentType.PLAYBACK, listOf(Regex("\\bנגן\\b")), "play", 10),
            VoiceCommandPattern("pb_he_pause", VoiceIntentType.PLAYBACK, listOf(Regex("\\bהשהה\\b")), "pause", 10),
            VoiceCommandPattern("pb_he_stop", VoiceIntentType.PLAYBACK, listOf(Regex("\\bעצור\\b")), "stop", 10),
            VoiceCommandPattern("pb_he_resume", VoiceIntentType.PLAYBACK, listOf(Regex("\\bהמשך\\b")), "resume", 10),
            VoiceCommandPattern("pb_he_rewind", VoiceIntentType.PLAYBACK, listOf(Regex("הרץ אחורה")), "rewind", 10),
            VoiceCommandPattern("pb_he_ff", VoiceIntentType.PLAYBACK, listOf(Regex("הרץ קדימה")), "fast_forward", 10),
            // -- Navigation (priority 8) --
            nav("nav_home", "go_home", 8, "go home", "daf habayit", "inicio"),
            nav("nav_search", "open_search", 8, "open search", "khipus", "buscar"),
            nav("nav_settings", "open_settings", 8, "go to settings", "hagdarot", "ajustes"),
            nav("nav_live", "open_live", 8, "open live", "shidur khai", "en vivo"),
            VoiceCommandPattern("nav_he_home", VoiceIntentType.NAVIGATION, listOf(Regex("דף הבית")), "go_home", 8),
            VoiceCommandPattern("nav_he_search", VoiceIntentType.NAVIGATION, listOf(Regex("חיפוש")), "open_search", 8),
            VoiceCommandPattern("nav_he_settings", VoiceIntentType.NAVIGATION, listOf(Regex("הגדרות")), "open_settings", 8),
            VoiceCommandPattern("nav_he_live", VoiceIntentType.NAVIGATION, listOf(Regex("שידור חי")), "open_live", 8),
            // -- Search (priority 9) --
            VoiceCommandPattern(
                "search_en", VoiceIntentType.SEARCH,
                listOf(Regex("search for (.+)"), Regex("find (.+)"), Regex("look for (.+)")),
                "search", 9,
            ),
            VoiceCommandPattern(
                "search_he", VoiceIntentType.SEARCH,
                listOf(Regex("חפש (.+)"), Regex("מצא (.+)")),
                "search", 9,
            ),
            VoiceCommandPattern(
                "search_es", VoiceIntentType.SEARCH,
                listOf(Regex("buscar (.+)"), Regex("encontrar (.+)")),
                "search", 9,
            ),
            // -- Volume (priority 7) --
            vol("vol_up", "volume_up", 7, "volume up", "hagber", "subir volumen"),
            vol("vol_down", "volume_down", 7, "volume down", "hanmekh", "bajar volumen"),
            vol("vol_mute", "mute", 7, "\\bmute\\b", "hashtok", "silenciar"),
            vol("vol_unmute", "unmute", 7, "unmute", "batel hashtaka", "activar sonido"),
            VoiceCommandPattern("vol_he_up", VoiceIntentType.PLAYBACK, listOf(Regex("\\bהגבר\\b")), "volume_up", 7),
            VoiceCommandPattern("vol_he_down", VoiceIntentType.PLAYBACK, listOf(Regex("\\bהנמך\\b")), "volume_down", 7),
            VoiceCommandPattern("vol_he_mute", VoiceIntentType.PLAYBACK, listOf(Regex("\\bהשתק\\b")), "mute", 7),
        )

        private fun playback(id: String, action: String, priority: Int, en: String, he: String, es: String) =
            VoiceCommandPattern(id, VoiceIntentType.PLAYBACK, listOf(Regex("\\b$en\\b"), Regex("\\b$he\\b"), Regex("\\b$es\\b")), action, priority)

        private fun nav(id: String, action: String, priority: Int, en: String, he: String, es: String) =
            VoiceCommandPattern(id, VoiceIntentType.NAVIGATION, listOf(Regex(en), Regex(he), Regex(es)), action, priority)

        private fun vol(id: String, action: String, priority: Int, en: String, he: String, es: String) =
            VoiceCommandPattern(id, VoiceIntentType.PLAYBACK, listOf(Regex(en), Regex(he), Regex(es)), action, priority)
    }
}
