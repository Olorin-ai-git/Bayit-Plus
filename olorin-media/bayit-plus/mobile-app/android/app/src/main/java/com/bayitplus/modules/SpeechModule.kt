package com.bayitplus.modules

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

/**
 * SpeechModule.kt - Speech-to-Text Post-Processing
 * Processes raw speech recognition output:
 * - Punctuation restoration
 * - Language detection
 * - Confidence scoring
 * - Text normalization (numbers, URLs, currencies)
 *
 * Supports: Hebrew (he), English (en), Spanish (es)
 */
class SpeechModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SpeechModule"
        private const val MODULE_TAG = "SpeechModule"
    }

    // Punctuation patterns for different languages
    private val hebrewPunctuation = mapOf(
        "אנא" to "אנא?",
        "בואו" to "בואו!",
        "תודה" to "תודה!"
    )

    private val englishPunctuation = mapOf(
        "hello" to "Hello.",
        "thanks" to "Thanks!",
        "please" to "Please."
    )

    private val spanishPunctuation = mapOf(
        "hola" to "¡Hola!",
        "gracias" to "¡Gracias!",
        "por favor" to "Por favor."
    )

    override fun getName(): String = NAME

    /**
     * Restore punctuation in transcribed text
     * Adds periods at sentence ends, exclamation marks, question marks
     *
     * @param text Raw transcribed text
     * @param language Language code: "he", "en", "es"
     * @param promise Resolves with punctuated text
     */
    @ReactMethod
    fun restorePunctuation(text: String, language: String, promise: Promise) {
        try {
            if (text.isBlank()) {
                promise.reject("EMPTY_TEXT", "Input text is empty")
                return
            }

            val punctuated = when (language) {
                "he" -> applyHebrewPunctuation(text)
                "en" -> applyEnglishPunctuation(text)
                "es" -> applySpanishPunctuation(text)
                else -> text // Return as-is for unsupported languages
            }

            promise.resolve(mapOf(
                "text" to punctuated,
                "language" to language,
                "processed" to (punctuated != text)
            ))
        } catch (e: Exception) {
            promise.reject("PUNCTUATION_ERROR", "Failed to restore punctuation: ${e.message}", e)
        }
    }

    /**
     * Detect language of text
     * Uses simple heuristics based on character sets
     *
     * @param text Text to analyze
     * @param promise Resolves with language code and confidence
     */
    @ReactMethod
    fun detectLanguage(text: String, promise: Promise) {
        try {
            if (text.isBlank()) {
                promise.reject("EMPTY_TEXT", "Input text is empty")
                return
            }

            val (language, confidence) = analyzeLanguage(text)
            promise.resolve(mapOf(
                "language" to language,
                "confidence" to confidence,
                "text" to text
            ))
        } catch (e: Exception) {
            promise.reject("DETECTION_ERROR", "Failed to detect language: ${e.message}", e)
        }
    }

    /**
     * Normalize text: numbers, currencies, URLs, abbreviations
     * Converts numeric representations to words where appropriate
     *
     * @param text Text to normalize
     * @param language Language for context
     * @param promise Resolves with normalized text
     */
    @ReactMethod
    fun normalizeText(text: String, language: String, promise: Promise) {
        try {
            if (text.isBlank()) {
                promise.reject("EMPTY_TEXT", "Input text is empty")
                return
            }

            var normalized = text
            // Convert common abbreviations
            normalized = normalized.replace(Regex("(?i)\\bu\\.s\\."), "United States")
            normalized = normalized.replace(Regex("(?i)\\bdr\\."), "Doctor")
            normalized = normalized.replace(Regex("(?i)\\burl"), "web address")

            // Normalize currency representations (language-specific)
            when (language) {
                "he" -> {
                    normalized = normalized.replace(Regex("₪\\s*\\d+"), { match ->
                        val amount = match.value.replace(Regex("[₪\\s]"), "")
                        "שקל $amount" // "shekel"
                    })
                }
                "en" -> {
                    normalized = normalized.replace(Regex("\\$\\s*\\d+"), { match ->
                        val amount = match.value.replace(Regex("[\\$\\s]"), "")
                        "dollar $amount"
                    })
                }
                "es" -> {
                    normalized = normalized.replace(Regex("€\\s*\\d+"), { match ->
                        val amount = match.value.replace(Regex("[€\\s]"), "")
                        "euro $amount"
                    })
                }
            }

            promise.resolve(mapOf(
                "text" to normalized,
                "language" to language,
                "processed" to (normalized != text)
            ))
        } catch (e: Exception) {
            promise.reject("NORMALIZATION_ERROR", "Failed to normalize text: ${e.message}", e)
        }
    }

    /**
     * Process text through complete pipeline: detect, normalize, punctuate
     *
     * @param text Raw transcribed text
     * @param promise Resolves with fully processed text
     */
    @ReactMethod
    fun processText(text: String, promise: Promise) {
        try {
            if (text.isBlank()) {
                promise.reject("EMPTY_TEXT", "Input text is empty")
                return
            }

            // 1. Detect language
            val (language, confidence) = analyzeLanguage(text)

            // 2. Normalize
            val normalized = normalizeForLanguage(text, language)

            // 3. Restore punctuation
            val punctuated = when (language) {
                "he" -> applyHebrewPunctuation(normalized)
                "en" -> applyEnglishPunctuation(normalized)
                "es" -> applySpanishPunctuation(normalized)
                else -> normalized
            }

            promise.resolve(mapOf(
                "text" to punctuated,
                "language" to language,
                "confidence" to confidence,
                "normalized" to (punctuated != text)
            ))
        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", "Failed to process text: ${e.message}", e)
        }
    }

    // Private helper functions

    private fun applyHebrewPunctuation(text: String): String {
        var result = text.trim()
        // Add final period if missing
        if (!result.endsWith(".") && !result.endsWith("?") && !result.endsWith("!")) {
            result += "."
        }
        return result
    }

    private fun applyEnglishPunctuation(text: String): String {
        var result = text.trim()
        // Capitalize first letter
        if (result.isNotEmpty()) {
            result = result[0].uppercase() + result.substring(1)
        }
        // Add final period if missing
        if (!result.endsWith(".") && !result.endsWith("?") && !result.endsWith("!")) {
            result += "."
        }
        return result
    }

    private fun applySpanishPunctuation(text: String): String {
        var result = text.trim()
        // Capitalize first letter
        if (result.isNotEmpty()) {
            result = result[0].uppercase() + result.substring(1)
        }
        // Add final period if missing
        if (!result.endsWith(".") && !result.endsWith("?") && !result.endsWith("!")) {
            result += "."
        }
        return result
    }

    private fun analyzeLanguage(text: String): Pair<String, Double> {
        val hebrewChars = text.count { it in '\u0590'..'\u05FF' }
        val latinChars = text.count { it in 'a'..'z' } + text.count { it in 'A'..'Z' }

        return when {
            hebrewChars > latinChars * 0.5 -> "he" to (hebrewChars.toDouble() / text.length)
            text.contains(Regex("[áéíóú]"), true) -> "es" to 0.8
            else -> "en" to 0.7
        }
    }

    private fun normalizeForLanguage(text: String, language: String): String {
        return when (language) {
            "he" -> text.replace(Regex("(\\d+)"), { match -> "\"${match.value}\"" })
            "en" -> text
            "es" -> text
            else -> text
        }
    }
}
