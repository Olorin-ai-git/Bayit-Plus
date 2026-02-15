package tv.bayit.plus.core.testing

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import tv.bayit.plus.core.model.LiveTVModels

/**
 * Fake implementation of LiveTVRepository for testing.
 */
class FakeLiveTVRepository {

    private val _channels = MutableStateFlow<List<LiveTVModels.Channel>>(emptyList())
    private val _currentPrograms = MutableStateFlow<Map<String, LiveTVModels.Program>>(emptyMap())

    var shouldThrowError = false
    var errorMessage = "Test error"

    /**
     * Get all live TV channels.
     */
    fun getChannels(): Flow<List<LiveTVModels.Channel>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return _channels
    }

    /**
     * Get channels by category.
     */
    fun getChannelsByCategory(category: String): Flow<List<LiveTVModels.Channel>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_channels.value.filter { it.category == category })
    }

    /**
     * Get channel by ID.
     */
    fun getChannelById(id: String): Flow<LiveTVModels.Channel?> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_channels.value.find { it.id == id })
    }

    /**
     * Get current program for a channel.
     */
    fun getCurrentProgram(channelId: String): Flow<LiveTVModels.Program?> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_currentPrograms.value[channelId])
    }

    /**
     * Get EPG schedule for a channel.
     */
    fun getEPGSchedule(
        channelId: String,
        startTime: Long,
        endTime: Long
    ): Flow<List<LiveTVModels.Program>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(emptyList())
    }

    // Test utility methods

    fun setChannels(channels: List<LiveTVModels.Channel>) {
        _channels.value = channels
    }

    fun addChannel(channel: LiveTVModels.Channel) {
        _channels.value = _channels.value + channel
    }

    fun setCurrentProgram(channelId: String, program: LiveTVModels.Program) {
        _currentPrograms.value = _currentPrograms.value + (channelId to program)
    }

    fun clear() {
        _channels.value = emptyList()
        _currentPrograms.value = emptyMap()
        shouldThrowError = false
    }
}
