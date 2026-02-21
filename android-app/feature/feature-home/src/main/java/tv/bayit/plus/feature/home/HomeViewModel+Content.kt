package tv.bayit.plus.feature.home

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.ShabbatInfo
import tv.bayit.plus.core.model.WatchHistoryItem

internal suspend fun HomeViewModel.loadFeaturedCollections(): List<CollectionDetail> {
    return try {
        when (val result = contentRepository.getCollectionRecommendations()) {
            is BayitResult.Success -> result.data
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load collection recommendations (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadLiveChannels(): List<LiveChannelItem> {
    return try {
        when (val result = liveTVRepository.getChannels()) {
            is BayitResult.Success -> {
                val channels = (result.data as? List<*>)?.filterIsInstance<LiveChannelItem>()
                    ?: emptyList()
                channels.filter { channel ->
                    val name = channel.name?.lowercase() ?: return@filter true
                    !hiddenChannelKeywords.any { keyword -> name.contains(keyword) }
                }.take(8)
            }
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load live channels (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadRadioStations(): List<RadioStationItem> {
    return try {
        when (val result = radioRepository.getStations()) {
            is BayitResult.Success -> {
                val stations = (result.data as? List<*>)?.filterIsInstance<RadioStationItem>()
                    ?: emptyList()
                stations.take(8)
            }
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load radio stations (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadContinueWatching(): List<WatchHistoryItem> {
    return try {
        when (val result = contentRepository.getContinueWatching()) {
            is BayitResult.Success -> {
                (result.data as? List<*>)?.filterIsInstance<WatchHistoryItem>() ?: emptyList()
            }
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load continue watching (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadTrending(): List<CultureTrendingItem> {
    return try {
        when (val result = contentRepository.getTrending()) {
            is BayitResult.Success -> {
                (result.data as? List<*>)?.filterIsInstance<CultureTrendingItem>() ?: emptyList()
            }
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load trending (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadYoungsters(): List<SectionContentItem> {
    return try {
        when (val result = contentRepository.getYoungstersTrending()) {
            is BayitResult.Success -> {
                (result.data as? List<*>)?.filterIsInstance<SectionContentItem>() ?: emptyList()
            }
            else -> emptyList()
        }
    } catch (e: Exception) {
        logger.debug("Failed to load youngsters (non-blocking)", mapOf("error" to e.message.orEmpty()))
        emptyList()
    }
}

internal suspend fun HomeViewModel.loadTelAvivContent(): CityContentResponse? {
    return try {
        when (val result = contentRepository.getTelAvivContent()) {
            is BayitResult.Success -> result.data as? CityContentResponse
            else -> null
        }
    } catch (e: Exception) {
        logger.debug("Failed to load Tel Aviv content (non-blocking)", mapOf("error" to e.message.orEmpty()))
        null
    }
}

internal suspend fun HomeViewModel.loadJerusalemContent(): CityContentResponse? {
    return try {
        when (val result = contentRepository.getJerusalemContent()) {
            is BayitResult.Success -> result.data as? CityContentResponse
            else -> null
        }
    } catch (e: Exception) {
        logger.debug("Failed to load Jerusalem content (non-blocking)", mapOf("error" to e.message.orEmpty()))
        null
    }
}

internal suspend fun HomeViewModel.loadShabbatInfo(): ShabbatInfo? {
    return try {
        when (val result = shabbatRepository.getShabbatTimes(32.0853, 34.7818)) {
            is BayitResult.Success -> result.data as? ShabbatInfo
            else -> null
        }
    } catch (e: Exception) {
        logger.debug("Failed to load Shabbat info (non-blocking)", mapOf("error" to e.message.orEmpty()))
        null
    }
}
