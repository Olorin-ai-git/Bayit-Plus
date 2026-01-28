/**
 * WidgetModule.kt - App Widgets Management
 * Manages lock screen widgets and home screen widgets
 * Supports widget data updates via AppWidgetManager
 */

package com.bayitplus.modules

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Widget Module - Lock screen and home screen widgets
 * Manages widget lifecycle and data updates
 */
class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "WidgetModule"
    private const val WIDGET_CLASS = "com.bayitplus.widgets.BayitPlusWidget"
  }

  private val appWidgetManager: AppWidgetManager
    get() = AppWidgetManager.getInstance(reactApplicationContext)

  override fun getName(): String = NAME

  @ReactMethod
  fun updateWidget(title: String, description: String, imageUrl: String?, promise: Promise) {
    try {
      val context = reactApplicationContext
      val componentName = ComponentName(context, WIDGET_CLASS)

      val widgetIds = try {
        appWidgetManager.getAppWidgetIds(componentName)
      } catch (e: Exception) {
        intArrayOf()
      }

      if (widgetIds.isEmpty()) {
        promise.resolve(mapOf("status" to "no_widgets", "updated" to 0))
        return
      }

      for (widgetId in widgetIds) {
        updateSingleWidget(widgetId, title, description, imageUrl, context)
      }

      promise.resolve(mapOf("status" to "widgets_updated", "count" to widgetIds.size))
    } catch (e: Exception) {
      promise.reject("UPDATE_FAILED", "Failed to update widgets: ${e.message}", e)
    }
  }

  @ReactMethod
  fun updateLockScreenWidget(title: String, subtitle: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        promise.reject("VERSION_NOT_SUPPORTED", "Lock screen widgets require API 31+")
        return
      }

      val context = reactApplicationContext
      val componentName = ComponentName(context, WIDGET_CLASS)
      
      val widgetIds = try {
        appWidgetManager.getAppWidgetIds(componentName)
      } catch (e: Exception) {
        intArrayOf()
      }

      for (widgetId in widgetIds) {
        val views = RemoteViews(context.packageName, android.R.layout.simple_list_item_2)
        views.setTextViewText(android.R.id.text1, title)
        views.setTextViewText(android.R.id.text2, subtitle)
        appWidgetManager.updateAppWidget(widgetId, views)
      }

      promise.resolve(mapOf("status" to "lock_screen_updated", "count" to widgetIds.size))
    } catch (e: Exception) {
      promise.reject("LOCK_SCREEN_FAILED", "Failed to update lock screen widget: ${e.message}", e)
    }
  }

  @ReactMethod
  fun getActiveWidgetCount(promise: Promise) {
    try {
      val context = reactApplicationContext
      val componentName = ComponentName(context, WIDGET_CLASS)
      
      val widgetIds = try {
        appWidgetManager.getAppWidgetIds(componentName)
      } catch (e: Exception) {
        intArrayOf()
      }

      promise.resolve(mapOf("count" to widgetIds.size, "widgetIds" to widgetIds.toList()))
    } catch (e: Exception) {
      promise.reject("COUNT_FAILED", "Failed to get widget count: ${e.message}", e)
    }
  }

  @ReactMethod
  fun isLockScreenWidgetSupported(promise: Promise) {
    val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    promise.resolve(mapOf("supported" to supported, "minApi" to 31))
  }

  @ReactMethod
  fun refreshWidget(promise: Promise) {
    try {
      val context = reactApplicationContext
      val componentName = ComponentName(context, WIDGET_CLASS)
      
      val widgetIds = try {
        appWidgetManager.getAppWidgetIds(componentName)
      } catch (e: Exception) {
        intArrayOf()
      }

      val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE, null, context, BayitPlusWidgetReceiver::class.java)
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
      context.sendBroadcast(intent)

      promise.resolve(mapOf("status" to "refresh_triggered", "count" to widgetIds.size))
    } catch (e: Exception) {
      promise.reject("REFRESH_FAILED", "Failed to refresh widgets: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setWidgetBadge(count: Int, promise: Promise) {
    try {
      val context = reactApplicationContext
      val componentName = ComponentName(context, WIDGET_CLASS)
      
      val widgetIds = try {
        appWidgetManager.getAppWidgetIds(componentName)
      } catch (e: Exception) {
        intArrayOf()
      }

      for (widgetId in widgetIds) {
        val views = RemoteViews(context.packageName, android.R.layout.simple_list_item_1)
        views.setTextViewText(android.R.id.text1, "Updates: $count")
        appWidgetManager.updateAppWidget(widgetId, views)
      }

      promise.resolve(mapOf("status" to "badge_set", "count" to count))
    } catch (e: Exception) {
      promise.reject("BADGE_FAILED", "Failed to set badge: ${e.message}", e)
    }
  }

  private fun updateSingleWidget(
    widgetId: Int,
    title: String,
    description: String,
    imageUrl: String?,
    context: Context
  ) {
    try {
      val views = RemoteViews(context.packageName, android.R.layout.simple_list_item_2)
      views.setTextViewText(android.R.id.text1, title)
      views.setTextViewText(android.R.id.text2, description)

      val intent = Intent(context, MainActivity::class.java)
      val pendingIntent = android.app.PendingIntent.getActivity(
        context,
        widgetId,
        intent,
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(android.R.id.list, pendingIntent)

      appWidgetManager.updateAppWidget(widgetId, views)
    } catch (e: Exception) {
      // Log error but don't throw
    }
  }
}

class BayitPlusWidgetReceiver : android.content.BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
      val widgetIds = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
      // Widget update logic here
    }
  }
}
