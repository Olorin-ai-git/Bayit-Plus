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
 * Unit tests for TTSModule.kt
 * Tests text-to-speech synthesis across languages
 * Covers initialization, speech rate, pitch, language support
 */
class TTSModuleTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    private lateinit var ttsModule: TTSModule

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        ttsModule = TTSModule(reactContext)
    }

    @Test
    fun testInitializeTTS() {
        ttsModule.initialize(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSpeakInEnglish() {
        ttsModule.speak("Hello world", "en", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSpeakInHebrew() {
        ttsModule.speak("שלום עולם", "he", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSpeakInSpanish() {
        ttsModule.speak("Hola mundo", "es", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetRateHalfSpeed() {
        ttsModule.setRate(0.5, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetRateNormalSpeed() {
        ttsModule.setRate(1.0, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetRateDoubleSpeed() {
        ttsModule.setRate(2.0, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetRateInvalidLow() {
        ttsModule.setRate(0.3, promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testSetRateInvalidHigh() {
        ttsModule.setRate(3.0, promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testSetPitchLow() {
        ttsModule.setPitch(0.5, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetPitchNormal() {
        ttsModule.setPitch(1.0, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetPitchHigh() {
        ttsModule.setPitch(2.0, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetPitchInvalid() {
        ttsModule.setPitch(3.0, promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testStop() {
        ttsModule.stop(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testShutdown() {
        ttsModule.shutdown(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testEmptyTextHandling() {
        ttsModule.speak("", "en", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testLanguageAvailabilityCheck() {
        // Should verify language is available before speaking
        ttsModule.speak("Test text", "en", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testUnsupportedLanguage() {
        ttsModule.speak("Test", "fr", promise)
        verify(promise).reject(any(), any<String>())
    }
}
