package tv.bayit.plus.feature.settings.downloads

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import tv.bayit.plus.core.data.download.DownloadPreferences
import tv.bayit.plus.core.data.download.DownloadQuality
import tv.bayit.plus.core.data.download.StorageMonitor
import javax.inject.Inject

@HiltViewModel
class DownloadSettingsViewModel @Inject constructor(
    private val downloadPreferences: DownloadPreferences,
    private val storageMonitor: StorageMonitor,
) : ViewModel() {

    var quality by mutableStateOf(downloadPreferences.quality)
        private set

    var wifiOnly by mutableStateOf(downloadPreferences.wifiOnly)
        private set

    var usedStorageMb by mutableLongStateOf(storageMonitor.usedDownloadStorageMb())
        private set

    var availableStorageMb by mutableLongStateOf(storageMonitor.availableStorageMb())
        private set

    fun updateQuality(newQuality: DownloadQuality) {
        quality = newQuality
        downloadPreferences.quality = newQuality
    }

    fun updateWifiOnly(enabled: Boolean) {
        wifiOnly = enabled
        downloadPreferences.wifiOnly = enabled
    }
}
