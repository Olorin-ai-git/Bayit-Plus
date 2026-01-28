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
 * Unit tests for SpeechModule.kt
 * Tests punctuation restoration, language detection, text normalization
 */
class SpeechModuleTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    private lateinit var speechModule: SpeechModule

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        speechModule = SpeechModule(reactContext)
    }

    @Test
    fun testRestorePunctuationInEnglish() {
        speechModule.restorePunctuation("hello world", "en", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRestorePunctuationInHebrew() {
        speechModule.restorePunctuation("שלום עולם", "he", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRestorePunctuationInSpanish() {
        speechModule.restorePunctuation("hola mundo", "es", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testDetectLanguageHebrewText() {
        speechModule.detectLanguage("שלום שלום שלום", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testDetectLanguageEnglishText() {
        speechModule.detectLanguage("hello world hello", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testDetectLanguageSpanishText() {
        speechModule.detectLanguage("hola mundo hola", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testNormalizeTextWithNumbers() {
        speechModule.normalizeText("I have 5 apples", "en", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testNormalizeTextWithCurrency() {
        speechModule.normalizeText("It costs 100 shekel", "he", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testNormalizeTextWithAbbreviations() {
        speechModule.normalizeText("The U.S. is a country", "en", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testProcessTextFullPipeline() {
        speechModule.processText("hello world", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testEmptyTextHandling() {
        speechModule.restorePunctuation("", "en", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testMultiLanguageInput() {
        // Mixed Hebrew and English text
        speechModule.detectLanguage("hello שלום world", promise)
        verify(promise).resolve(any())
    }
}
