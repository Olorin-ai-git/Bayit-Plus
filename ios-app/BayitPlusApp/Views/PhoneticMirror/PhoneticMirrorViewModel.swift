import AVFoundation
import BayitLocalization
import Speech
import SwiftUI

@Observable
class PhoneticMirrorViewModel {
    var mirrorState: MirrorState = .idle
    var currentPhrase: PracticePhrase?
    var phrases: [PracticePhrase] = []
    var lastResult: MirrorAttemptResult?
    var isRecording = false
    var error: String?

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?

    enum MirrorState { case idle, recording, processing, feedback }

    func setupSpeech() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        audioEngine = AVAudioEngine()
        SFSpeechRecognizer.requestAuthorization { _ in }
    }

    func startRecording() {
        guard mirrorState == .idle else { return }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement)
            try session.setActive(true)
        } catch {
            self.error = LocalizationManager.shared.t("phoneticMirror.errors.audioSession")
            return
        }

        let tempDir = FileManager.default.temporaryDirectory
        recordingURL = tempDir.appendingPathComponent("mirror_recording.wav")

        let recorderSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: recorderSettings)
            audioRecorder?.record()
            isRecording = true
            mirrorState = .recording
        } catch {
            self.error = LocalizationManager.shared.t("phoneticMirror.errors.recording")
        }
    }

    func stopRecording() -> Data? {
        audioRecorder?.stop()
        isRecording = false

        guard let url = recordingURL,
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        try? FileManager.default.removeItem(at: url)
        return data
    }

    func submitAttempt(
        audioData: Data,
        repository: PhoneticMirrorRepository,
        avatarId: String,
        profileId: String
    ) async {
        mirrorState = .processing

        guard let phrase = currentPhrase else {
            error = LocalizationManager.shared.t("phoneticMirror.errors.noPhrase")
            mirrorState = .idle
            return
        }

        do {
            let result = try await repository.submitAttempt(
                audio: audioData,
                targetPhraseHe: phrase.phraseHe,
                targetTransliteration: phrase.transliteration,
                avatarId: avatarId,
                profileId: profileId
            )
            await MainActor.run {
                lastResult = result
                mirrorState = .feedback
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                mirrorState = .idle
            }
        }
    }

    func nextPhrase() {
        guard !phrases.isEmpty else { return }
        let currentIdx = phrases.firstIndex { $0.phraseHe == currentPhrase?.phraseHe } ?? -1
        let nextIdx = (currentIdx + 1) % phrases.count
        currentPhrase = phrases[nextIdx]
        lastResult = nil
        mirrorState = .idle
    }

    func retry() {
        lastResult = nil
        mirrorState = .idle
    }

    func cleanup() {
        audioRecorder?.stop()
        audioRecorder = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        try? audioEngine?.stop()
        audioEngine = nil
    }
}

struct PracticePhrase: Codable, Identifiable {
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

struct MirrorAttemptResult: Codable {
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

struct PhonemeFeedbackItem: Codable, Identifiable {
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
