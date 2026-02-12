import Foundation

// MARK: - V2V Practice Phrases

struct V2VPracticePhrase: Codable, Sendable, Identifiable {
    var id: String { phraseHe }
    let phraseHe: String
    let transliteration: String
    let translation: String

    enum CodingKeys: String, CodingKey {
        case phraseHe = "phrase_he"
        case transliteration, translation
    }
}
