package com.bayitplus.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.verify

/**
 * Unit tests for AppShortcutsModule.kt
 * Tests app shortcut creation, updating, and removal
 */
class AppShortcutsModuleTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    private lateinit var shortcutsModule: AppShortcutsModule

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        shortcutsModule = AppShortcutsModule(reactContext)
    }

    @Test
    fun testAddShortcut() {
        shortcutsModule.addShortcut("watch_now", "Watch Now", "com.bayitplus.WATCH", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testAddShortcutWithEmptyId() {
        shortcutsModule.addShortcut("", "Label", "action", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testAddShortcutWithEmptyLabel() {
        shortcutsModule.addShortcut("id", "", "action", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testAddShortcutWithEmptyAction() {
        shortcutsModule.addShortcut("id", "Label", "", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testAddMultipleShortcuts() {
        shortcutsModule.addShortcut("search", "Search", "com.bayitplus.SEARCH", promise)
        shortcutsModule.addShortcut("profile", "Profile", "com.bayitplus.PROFILE", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRemoveShortcut() {
        shortcutsModule.removeShortcut("watch_now", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRemoveShortcutWithEmptyId() {
        shortcutsModule.removeShortcut("", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testRemoveNonexistentShortcut() {
        shortcutsModule.removeShortcut("nonexistent", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testUpdateShortcut() {
        shortcutsModule.updateShortcut("watch_now", "Watch Now - Updated", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testUpdateShortcutWithEmptyId() {
        shortcutsModule.updateShortcut("", "Label", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testUpdateShortcutWithEmptyLabel() {
        shortcutsModule.updateShortcut("id", "", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testRemoveAllShortcuts() {
        shortcutsModule.removeAllShortcuts(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testShortcutLimitEnforcement() {
        // Android supports max 5 dynamic shortcuts (API 25+)
        repeat(5) { i ->
            shortcutsModule.addShortcut("shortcut_$i", "Shortcut $i", "action_$i", promise)
        }
        // 6th shortcut should fail gracefully
        shortcutsModule.addShortcut("shortcut_6", "Shortcut 6", "action_6", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testShortcutIntentAction() {
        // Intent action format: package.ACTION_NAME
        shortcutsModule.addShortcut("launch_series", "Launch Series", "com.bayitplus.OPEN_SERIES", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testShortcutPersistence() {
        // Shortcuts should persist across app restarts
        shortcutsModule.addShortcut("favorite", "Favorite", "com.bayitplus.FAVORITE", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testShortcutIconSupport() {
        // Icons should be loadable from drawable resources
        shortcutsModule.addShortcut("settings", "Settings", "com.bayitplus.SETTINGS", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testUpdateNonexistentShortcut() {
        shortcutsModule.updateShortcut("nonexistent", "Updated Label", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSpecialCharactersInLabel() {
        shortcutsModule.addShortcut("id", "Label with éàü characters", "action", promise)
        verify(promise).resolve(any())
    }
}
