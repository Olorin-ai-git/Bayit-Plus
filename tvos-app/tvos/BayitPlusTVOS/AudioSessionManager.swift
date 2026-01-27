/**
 * AudioSessionManager - tvOS Audio Session Management
 *
 * Manages audio sessions for tvOS with:
 * - Background audio playback
 * - Audio ducking for voice/TTS
 * - Voice + media playback coordination
 * - Audio interruption handling
 * - Now Playing Info Center integration
 * - Remote Command Center (Siri Remote)
 *
 * tvOS-specific audio session categories:
 * - .playback (for media playback)
 * - .record (for voice capture)
 * - .playAndRecord (for simultaneous voice + media)
 *
 * Ported from iOS with tvOS adaptations
 */

import AVFoundation
import MediaPlayer
import React

@objc(AudioSessionManager)
class AudioSessionManager: NSObject, RCTBridgeModule {

    static func moduleName() -> String! {
        return "AudioSessionManager"
    }

    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    // MARK: - Audio Session Configuration

    @objc func configureAudioSession(_ mode: String,
                                     resolve: @escaping RCTPromiseResolveBlock,
                                     reject: @escaping RCTPromiseRejectBlock) {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            switch mode {
            case "playback":
                // Standard media playback
                try audioSession.setCategory(
                    .playback,
                    mode: .moviePlayback,
                    options: [.allowAirPlay, .allowBluetooth]
                )

            case "voice":
                // Voice capture (Siri Remote microphone)
                try audioSession.setCategory(
                    .record,
                    mode: .measurement,
                    options: []
                )

            case "voiceWithPlayback":
                // Voice + media playback (live dubbing)
                try audioSession.setCategory(
                    .playAndRecord,
                    mode: .spokenAudio,
                    options: [.duckOthers, .allowBluetooth]
                )

            case "tts":
                // Text-to-speech with ducking
                try audioSession.setCategory(
                    .playback,
                    mode: .spokenAudio,
                    options: [.duckOthers]
                )

            default:
                // Default playback
                try audioSession.setCategory(.playback, mode: .moviePlayback)
            }

            try audioSession.setActive(true)

            // Register for interruption notifications
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleInterruption),
                name: AVAudioSession.interruptionNotification,
                object: audioSession
            )

            resolve(["success": true, "mode": mode])
        } catch {
            reject("AUDIO_SESSION_ERROR", "Failed to configure audio session: \(error)", error)
        }
    }

    @objc func setAudioCategory(_ category: String,
                               options: [String],
                               resolve: @escaping RCTPromiseResolveBlock,
                               reject: @escaping RCTPromiseRejectBlock) {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            let categoryEnum: AVAudioSession.Category
            switch category {
            case "playback":
                categoryEnum = .playback
            case "record":
                categoryEnum = .record
            case "playAndRecord":
                categoryEnum = .playAndRecord
            default:
                categoryEnum = .playback
            }

            var optionsEnum: AVAudioSession.CategoryOptions = []
            for option in options {
                switch option {
                case "duckOthers":
                    optionsEnum.insert(.duckOthers)
                case "allowBluetooth":
                    optionsEnum.insert(.allowBluetooth)
                case "allowAirPlay":
                    optionsEnum.insert(.allowAirPlay)
                default:
                    break
                }
            }

            try audioSession.setCategory(categoryEnum, options: optionsEnum)
            try audioSession.setActive(true)

            resolve(["success": true])
        } catch {
            reject("AUDIO_SESSION_ERROR", "Failed to set audio category: \(error)", error)
        }
    }

    @objc func enableBackgroundAudio(_ resolve: @escaping RCTPromiseResolveBlock,
                                     reject: @escaping RCTPromiseRejectBlock) {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            // Enable background audio playback on tvOS
            try audioSession.setCategory(.playback, mode: .moviePlayback, options: [])
            try audioSession.setActive(true)

            resolve(["enabled": true])
        } catch {
            reject("AUDIO_SESSION_ERROR", "Failed to enable background audio: \(error)", error)
        }
    }

    @objc func duckAudioForVoice(_ enabled: Bool,
                                 resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            if enabled {
                // Duck background audio (reduce to 0.3x volume)
                try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            } else {
                // Restore normal audio
                try audioSession.setCategory(.playback, mode: .moviePlayback)
            }

            try audioSession.setActive(true)

            resolve(["ducking": enabled])
        } catch {
            reject("AUDIO_SESSION_ERROR", "Failed to configure audio ducking: \(error)", error)
        }
    }

    // MARK: - Audio Interruption Handling

    @objc private func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            // Audio interrupted - pause playback
            NotificationCenter.default.post(name: .pausePlayback, object: nil)

        case .ended:
            guard let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else {
                return
            }
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) {
                // Resume playback after interruption
                NotificationCenter.default.post(name: .resumePlayback, object: nil)
            }

        @unknown default:
            break
        }
    }

    // MARK: - Now Playing Info Center

    @objc func updateNowPlayingInfo(_ metadata: [String: Any],
                                    resolve: @escaping RCTPromiseResolveBlock,
                                    reject: @escaping RCTPromiseRejectBlock) {
        var nowPlayingInfo = [String: Any]()

        if let title = metadata["title"] as? String {
            nowPlayingInfo[MPMediaItemPropertyTitle] = title
        }

        if let artist = metadata["artist"] as? String {
            nowPlayingInfo[MPMediaItemPropertyArtist] = artist
        }

        if let album = metadata["album"] as? String {
            nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = album
        }

        if let currentTime = metadata["currentTime"] as? Double {
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        }

        if let duration = metadata["duration"] as? Double {
            nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
        }

        // Load artwork asynchronously
        if let imageURL = metadata["imageURL"] as? String,
           let url = URL(string: imageURL) {
            DispatchQueue.global(qos: .userInitiated).async {
                if let data = try? Data(contentsOf: url),
                   let image = UIImage(data: data) {
                    let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                    nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
                    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
                }
            }
        } else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
        }

        resolve(["success": true])
    }

    @objc func clearNowPlayingInfo(_ resolve: @escaping RCTPromiseResolveBlock,
                                   reject: @escaping RCTPromiseRejectBlock) {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        resolve(["success": true])
    }

    // MARK: - Remote Command Center (Siri Remote)

    @objc func setupRemoteCommandHandlers(_ resolve: @escaping RCTPromiseResolveBlock,
                                         reject: @escaping RCTPromiseRejectBlock) {
        let commandCenter = MPRemoteCommandCenter.shared()

        // Play command
        commandCenter.playCommand.addTarget { [weak self] event in
            NotificationCenter.default.post(name: .playCommandReceived, object: nil)
            return .success
        }

        // Pause command
        commandCenter.pauseCommand.addTarget { [weak self] event in
            NotificationCenter.default.post(name: .pauseCommandReceived, object: nil)
            return .success
        }

        // Seek command
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            if let event = event as? MPChangePlaybackPositionCommandEvent {
                NotificationCenter.default.post(
                    name: .seekCommandReceived,
                    object: nil,
                    userInfo: ["position": event.positionTime]
                )
                return .success
            }
            return .commandFailed
        }

        resolve(["success": true])
    }
}

// MARK: - Notification Extensions

extension Notification.Name {
    static let pausePlayback = Notification.Name("pausePlayback")
    static let resumePlayback = Notification.Name("resumePlayback")
    static let playCommandReceived = Notification.Name("playCommandReceived")
    static let pauseCommandReceived = Notification.Name("pauseCommandReceived")
    static let seekCommandReceived = Notification.Name("seekCommandReceived")
}
