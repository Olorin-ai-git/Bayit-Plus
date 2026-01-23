import AVFoundation
import MediaPlayer

class AudioSessionManager {
    static let shared = AudioSessionManager()

    private init() {}

    func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            #if os(tvOS)
            try audioSession.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers, .allowAirPlay, .allowBluetoothA2DP]
            )
            #else
            try audioSession.setCategory(.playback, mode: .spokenAudio)
            #endif

            try audioSession.setActive(true)

            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleInterruption),
                name: AVAudioSession.interruptionNotification,
                object: audioSession
            )
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }

    @objc func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            NotificationCenter.default.post(name: .pausePlayback, object: nil)
        case .ended:
            guard let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else {
                return
            }
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) {
                NotificationCenter.default.post(name: .resumePlayback, object: nil)
            }
        @unknown default:
            break
        }
    }

    func updateNowPlayingInfo(
        episode: PodcastEpisodeInfo,
        language: String,
        currentTime: Double,
        duration: Double
    ) {
        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = episode.title
        nowPlayingInfo[MPMediaItemPropertyArtist] = episode.author ?? "Unknown"
        nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = "Language: \(language.uppercased())"
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration

        if let imageURL = episode.thumbnail,
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
    }

    func setupRemoteCommandCenter(
        onPlay: @escaping () -> Void,
        onPause: @escaping () -> Void,
        onSeek: @escaping (Double) -> Void
    ) {
        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.addTarget { _ in
            onPlay()
            return .success
        }

        commandCenter.pauseCommand.addTarget { _ in
            onPause()
            return .success
        }

        commandCenter.changePlaybackPositionCommand.addTarget { event in
            if let event = event as? MPChangePlaybackPositionCommandEvent {
                onSeek(event.positionTime)
                return .success
            }
            return .commandFailed
        }
    }
}

struct PodcastEpisodeInfo {
    let title: String
    let author: String?
    let thumbnail: String?
}

extension Notification.Name {
    static let pausePlayback = Notification.Name("pausePlayback")
    static let resumePlayback = Notification.Name("resumePlayback")
}
