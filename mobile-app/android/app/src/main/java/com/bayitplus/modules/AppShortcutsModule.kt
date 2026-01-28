/**
 * AppShortcutsModule.kt - App Shortcuts Management
 * Manages dynamic app shortcuts (long-press app icon)
 * Supports custom actions, deep linking, and pinning
 */

package com.bayitplus.modules

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Arrays

/**
 * App Shortcuts Module - Available on API 25+
 * Creates dynamic shortcuts for quick access to common actions
 */
@RequiresApi(Build.VERSION_CODES.N_MR1)
class AppShortcutsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "AppShortcutsModule"
    private const val MAX_SHORTCUTS = 5
  }

  private val shortcutManager: ShortcutManager?
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
      reactApplicationContext.getSystemService(ShortcutManager::class.java)
    } else null

  override fun getName(): String = NAME

  @ReactMethod
  fun createShortcuts(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
        promise.reject("VERSION_NOT_SUPPORTED", "App shortcuts require API 25+")
        return
      }

      val shortcuts = listOf(
        createPlayShortcut(),
        createSearchShortcut(),
        createDownloadsShortcut(),
        createFavoritesShortcut(),
        createSettingsShortcut()
      ).filterNotNull().take(MAX_SHORTCUTS)

      shortcutManager?.dynamicShortcuts = shortcuts
      promise.resolve(mapOf("status" to "shortcuts_created", "count" to shortcuts.size))
    } catch (e: Exception) {
      promise.reject("SHORTCUTS_FAILED", "Failed to create shortcuts: ${e.message}", e)
    }
  }

  @ReactMethod
  fun updateShortcut(shortcutId: String, label: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
        promise.reject("VERSION_NOT_SUPPORTED", "App shortcuts require API 25+")
        return
      }

      val shortcut = ShortcutInfo.Builder(reactApplicationContext, shortcutId)
        .setLongLabel(label)
        .setShortLabel(label)
        .build()

      shortcutManager?.updateShortcuts(listOf(shortcut))
      promise.resolve(mapOf("status" to "shortcut_updated", "id" to shortcutId))
    } catch (e: Exception) {
      promise.reject("UPDATE_FAILED", "Failed to update shortcut: ${e.message}", e)
    }
  }

  @ReactMethod
  fun getShortcuts(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
        promise.reject("VERSION_NOT_SUPPORTED", "App shortcuts require API 25+")
        return
      }

      val shortcuts = shortcutManager?.dynamicShortcuts?.map { shortcut ->
        mapOf(
          "id" to shortcut.id,
          "label" to (shortcut.longLabel ?: shortcut.shortLabel),
          "enabled" to shortcut.isEnabled
        )
      } ?: emptyList()

      promise.resolve(mapOf("shortcuts" to shortcuts, "count" to shortcuts.size))
    } catch (e: Exception) {
      promise.reject("GET_FAILED", "Failed to get shortcuts: ${e.message}", e)
    }
  }

  @ReactMethod
  fun clearShortcuts(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
        promise.reject("VERSION_NOT_SUPPORTED", "App shortcuts require API 25+")
        return
      }

      shortcutManager?.removeAllDynamicShortcuts()
      promise.resolve(mapOf("status" to "shortcuts_cleared"))
    } catch (e: Exception) {
      promise.reject("CLEAR_FAILED", "Failed to clear shortcuts: ${e.message}", e)
    }
  }

  private fun createPlayShortcut(): ShortcutInfo? {
    return try {
      val intent = Intent("android.intent.action.VIEW")
        .setData(Uri.parse("bayitplus://player"))

      ShortcutInfo.Builder(reactApplicationContext, "play_shortcut")
        .setShortLabel("Play")
        .setLongLabel("Continue Playing")
        .setIcon(Icon.createWithResource(reactApplicationContext, android.R.drawable.ic_media_play))
        .setIntent(intent)
        .build()
    } catch (e: Exception) {
      null
    }
  }

  private fun createSearchShortcut(): ShortcutInfo? {
    return try {
      val intent = Intent("android.intent.action.SEARCH")
        .setData(Uri.parse("bayitplus://search"))

      ShortcutInfo.Builder(reactApplicationContext, "search_shortcut")
        .setShortLabel("Search")
        .setLongLabel("Search Content")
        .setIcon(Icon.createWithResource(reactApplicationContext, android.R.drawable.ic_search_category_default))
        .setIntent(intent)
        .build()
    } catch (e: Exception) {
      null
    }
  }

  private fun createDownloadsShortcut(): ShortcutInfo? {
    return try {
      val intent = Intent("android.intent.action.VIEW")
        .setData(Uri.parse("bayitplus://downloads"))

      ShortcutInfo.Builder(reactApplicationContext, "downloads_shortcut")
        .setShortLabel("Downloads")
        .setLongLabel("My Downloads")
        .setIcon(Icon.createWithResource(reactApplicationContext, android.R.drawable.ic_input_get))
        .setIntent(intent)
        .build()
    } catch (e: Exception) {
      null
    }
  }

  private fun createFavoritesShortcut(): ShortcutInfo? {
    return try {
      val intent = Intent("android.intent.action.VIEW")
        .setData(Uri.parse("bayitplus://favorites"))

      ShortcutInfo.Builder(reactApplicationContext, "favorites_shortcut")
        .setShortLabel("Favorites")
        .setLongLabel("Favorite Content")
        .setIcon(Icon.createWithResource(reactApplicationContext, android.R.drawable.btn_star))
        .setIntent(intent)
        .build()
    } catch (e: Exception) {
      null
    }
  }

  private fun createSettingsShortcut(): ShortcutInfo? {
    return try {
      val intent = Intent("android.intent.action.VIEW")
        .setData(Uri.parse("bayitplus://settings"))

      ShortcutInfo.Builder(reactApplicationContext, "settings_shortcut")
        .setShortLabel("Settings")
        .setLongLabel("App Settings")
        .setIcon(Icon.createWithResource(reactApplicationContext, android.R.drawable.ic_menu_preferences))
        .setIntent(intent)
        .build()
    } catch (e: Exception) {
      null
    }
  }
}
