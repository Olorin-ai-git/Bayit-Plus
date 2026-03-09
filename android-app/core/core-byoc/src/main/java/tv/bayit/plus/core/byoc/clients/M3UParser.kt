package tv.bayit.plus.core.byoc.clients

import tv.bayit.plus.core.byoc.models.BYOCChannel
import tv.bayit.plus.core.byoc.models.BYOCChannelGroup
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class M3UParser @Inject constructor() {

    fun parse(content: String, sourceId: String): List<BYOCChannel> {
        val lines = content
            .removePrefix(BOM)
            .lines()
            .map { it.trim() }

        val channels = mutableListOf<BYOCChannel>()
        var i = 0

        while (i < lines.size) {
            val line = lines[i]
            if (line.startsWith(EXTINF_PREFIX)) {
                val attributes = parseAttributes(line)
                val name = extractName(line)
                val url = findNextUrl(lines, i + 1)
                if (url != null) {
                    channels.add(
                        BYOCChannel(
                            id = "${sourceId}_${channels.size}",
                            name = name,
                            logoUrl = attributes[ATTR_TVG_LOGO],
                            group = attributes[ATTR_GROUP_TITLE] ?: DEFAULT_GROUP,
                            streamUrl = url,
                            sourceId = sourceId,
                            attributes = attributes,
                        ),
                    )
                }
            }
            i++
        }
        return channels
    }

    fun groupChannels(channels: List<BYOCChannel>): List<BYOCChannelGroup> {
        return channels
            .groupBy { it.group }
            .map { (groupName, groupChannels) ->
                BYOCChannelGroup(name = groupName, channels = groupChannels)
            }
            .sortedBy { it.name }
    }

    private fun parseAttributes(line: String): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val matcher = ATTR_PATTERN.toRegex()
        matcher.findAll(line).forEach { match ->
            val key = match.groupValues[1]
            val value = match.groupValues[2]
            result[key] = value
        }
        return result
    }

    private fun extractName(line: String): String {
        val commaIndex = line.lastIndexOf(',')
        return if (commaIndex >= 0 && commaIndex < line.length - 1) {
            line.substring(commaIndex + 1).trim()
        } else {
            "Unknown Channel"
        }
    }

    private fun findNextUrl(lines: List<String>, startIndex: Int): String? {
        var i = startIndex
        while (i < lines.size) {
            val line = lines[i]
            if (line.isNotBlank() && !line.startsWith("#")) {
                return line
            }
            if (line.startsWith(EXTINF_PREFIX)) return null
            i++
        }
        return null
    }

    companion object {
        private const val BOM = "\uFEFF"
        private const val EXTINF_PREFIX = "#EXTINF:"
        private const val ATTR_PATTERN = """(\S+?)="([^"]*)""""
        private const val ATTR_TVG_LOGO = "tvg-logo"
        private const val ATTR_GROUP_TITLE = "group-title"
        private const val DEFAULT_GROUP = "Ungrouped"
    }
}
