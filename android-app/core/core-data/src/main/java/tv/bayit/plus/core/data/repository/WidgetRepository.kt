package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface WidgetRepository {
    suspend fun getActiveWidgets(): BayitResult<List<Any>>
    suspend fun getWidgetData(widgetId: String): BayitResult<Any>
    suspend fun updateWidgetConfig(widgetId: String, config: Map<String, Any>): BayitResult<Unit>
    suspend fun getAvailableWidgets(): BayitResult<List<Any>>
    suspend fun enableWidget(widgetType: String): BayitResult<Any>
    suspend fun disableWidget(widgetId: String): BayitResult<Unit>
    suspend fun toggleMinimize(widgetId: String, isMinimized: Boolean): BayitResult<Unit>
}
