package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.EPGEntry

/**
 * Fake implementation of LiveTVRepository for testing.
 */
class FakeLiveTVRepository : LiveTVRepository {

    private val channels = mutableListOf<LiveChannelItem>()
    private val currentPrograms = mutableMapOf<String, EPGEntry>()

    var shouldReturnError = false
    var errorMessage = "Test error"

    override suspend fun getChannels(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(channels.toList())
        }
    }

    override suspend fun getChannel(channelId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val channel = channels.find { it.id == channelId }
            if (channel != null) {
                BayitResult.Success(channel)
            } else {
                BayitResult.Error(Exception("Channel not found: $channelId"))
            }
        }
    }

    override suspend fun getStreamUrl(channelId: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success("https://stream.example.com/channel/$channelId")
        }
    }

    override suspend fun getCurrentProgram(channelId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val program = currentPrograms[channelId]
            if (program != null) {
                BayitResult.Success(program)
            } else {
                BayitResult.Error(Exception("No current program for channel: $channelId"))
            }
        }
    }

    override suspend fun getChannelsByCategory(category: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(channels.filter { it.category == category })
        }
    }

    fun getEPGSchedule(
        channelId: String,
        startTime: Long,
        endTime: Long
    ): BayitResult<List<EPGEntry>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(emptyList())
        }
    }

    fun setChannels(channelsList: List<LiveChannelItem>) {
        channels.clear()
        channels.addAll(channelsList)
    }

    fun addChannel(channel: LiveChannelItem) {
        channels.add(channel)
    }

    fun setCurrentProgram(channelId: String, program: EPGEntry) {
        currentPrograms[channelId] = program
    }

    fun clear() {
        channels.clear()
        currentPrograms.clear()
        shouldReturnError = false
    }
}
