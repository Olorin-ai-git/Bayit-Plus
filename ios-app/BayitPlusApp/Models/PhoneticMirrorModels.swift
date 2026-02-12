import Foundation

// MARK: - Practice Phrases

struct PracticePhrase: Codable, Sendable, Identifiable {
    var id: String { phraseHe }
    let phraseHe: String
    let transliteration: String
    let translation: String
    let difficulty: String
    let category: String
    let sourceWord: String?

    enum CodingKeys: String, CodingKey {
        case phraseHe = "phrase_he"
        case transliteration, translation, difficulty, category
        case sourceWord = "source_word"
    }
}

// MARK: - Attempt Results

struct MirrorAttemptResult: Codable, Sendable {
    let id: String
    let pronunciationScore: Double
    let quality: String
    let phonemeFeedback: [PhonemeFeedbackItem]
    let correctedAudioUrl: String?
    let shekelsEarned: Int
    let inputTranscript: String
    let targetPhraseHe: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case pronunciationScore = "pronunciation_score"
        case quality
        case phonemeFeedback = "phoneme_feedback"
        case correctedAudioUrl = "corrected_audio_url"
        case shekelsEarned = "shekels_earned"
        case inputTranscript = "input_transcript"
        case targetPhraseHe = "target_phrase_he"
        case createdAt = "created_at"
    }
}

struct PhonemeFeedbackItem: Codable, Sendable, Identifiable {
    var id: String { wordHe }
    let wordHe: String
    let expectedTransliteration: String
    let heardTransliteration: String
    let score: Double
    let issueType: String?

    enum CodingKeys: String, CodingKey {
        case wordHe = "word_he"
        case expectedTransliteration = "expected_transliteration"
        case heardTransliteration = "heard_transliteration"
        case score
        case issueType = "issue_type"
    }
}
