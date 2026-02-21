import AVFoundation
import Speech
import SwiftUI

@Observable
class InteractiveMissionViewModel {
    var mission: InteractiveMission?
    var playState: PlayState = .loading
    var currentScene: Int = 1
    var lastResult: AttemptResult?
    var isListening = false
    var countdown: Int = 0
    var error: String?
    var player: AVPlayer?
    var currentAttempt = 1
    var earnedShekels = 0
    var finalScore = 0.0
    var onTranscript: ((String) -> Void)?

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var timeObserver: Any?
    private var countdownTimer: Timer?

    enum PlayState { case loading, playing, decision, complete }

    var currentSceneData: InteractiveMission.Scene? {
        mission?.scenes.first { $0.sceneNumber == currentScene }
    }

    func setupSpeech() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        audioEngine = AVAudioEngine()
        SFSpeechRecognizer.requestAuthorization { _ in }
    }

    func setupPlayer(videoUrl: String) {
        let playerItem = AVPlayerItem(url: URL(string: videoUrl)!)
        player = AVPlayer(playerItem: playerItem)
        playState = .playing
        player?.play()
        observePlayer()
    }

    func observePlayer() {
        guard let player = player else { return }
        let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            self?.checkSceneTransition(currentTime: time)
        }
    }

    func checkSceneTransition(currentTime: CMTime) {
        guard let scene = currentSceneData, playState == .playing else { return }
        let current = currentTime.seconds
        if current >= scene.decisionPoint {
            player?.pause()
            playState = .decision
            startCountdown()
        }
    }

    func startCountdown() {
        countdownTimer?.invalidate()
        countdown = 10
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            if self.countdown > 0 {
                self.countdown -= 1
            } else {
                timer.invalidate()
                self.countdownTimer = nil
            }
        }
    }

    func toggleListening() {
        if isListening {
            stopListening()
        } else {
            startListening()
        }
    }

    func startListening() {
        guard let recognizer = speechRecognizer, let engine = audioEngine, recognizer.isAvailable else { return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        let inputNode = engine.inputNode
        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, _ in
            if let result = result, result.isFinal {
                let transcript = result.bestTranscription.formattedString
                self?.stopListening()
                self?.onTranscript?(transcript)
            }
        }
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        engine.prepare()
        try? engine.start()
        isListening = true
    }

    func stopListening() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionTask?.cancel()
        isListening = false
    }

    func handleSubmitResult(_ result: AttemptResult) {
        lastResult = result
        if result.success {
            advanceScene()
        } else {
            currentAttempt += 1
            if currentAttempt > 3 {
                advanceScene()
            }
        }
    }

    func advanceScene() {
        guard let mission = mission else { return }
        if currentScene < mission.scenes.count {
            currentScene += 1
            currentAttempt = 1
            lastResult = nil
            playState = .playing
            player?.play()
        } else {
            playState = .complete
        }
    }

    func handleCompletion(_ completion: MissionCompletion) {
        earnedShekels = completion.earnedShekels
        finalScore = completion.finalScore
        playState = .complete
    }

    func cleanup() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        player?.pause()
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
        }
        player = nil
        stopListening()
        audioEngine = nil
        speechRecognizer = nil
    }
}
