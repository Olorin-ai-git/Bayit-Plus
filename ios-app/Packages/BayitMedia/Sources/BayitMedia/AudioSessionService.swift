import AVFoundation
import BayitCore
import Foundation

/// Manages the AVAudioSession for the app's media playback needs.
///
/// Ported from mobile-app/ios/BayitPlus/AudioSessionManager.swift,
/// removing RCT bridge dependencies and converting to async/await.
public final class AudioSessionService: Sendable {
    private let logger = BayitLogger(category: "AudioSession")

    public init() {}

    // MARK: - Configuration

    /// Configure audio session for video playback (movies, live TV).
    public func configureForVideo() {
        configureSession(
            category: .playback,
            mode: .moviePlayback,
            options: [.allowAirPlay, .allowBluetoothA2DP]
        )
    }

    /// Configure audio session for audio content (radio, podcasts, audiobooks).
    public func configureForAudio() {
        configureSession(
            category: .playback,
            mode: .spokenAudio,
            options: [.allowAirPlay, .allowBluetoothA2DP]
        )
    }

    /// Configure audio session for dubbing overlay (duck other audio).
    public func configureForDubbing() {
        configureSession(
            category: .playback,
            mode: .spokenAudio,
            options: [.duckOthers, .allowAirPlay, .allowBluetoothA2DP]
        )
    }

    /// Configure audio session based on media content type.
    public func configure(for contentType: MediaContentType) {
        switch contentType {
        case .liveTV, .vod, .youtubeVOD, .youtubeLive:
            configureForVideo()
        case .radio, .podcast, .audiobook:
            configureForAudio()
        }
    }

    /// Activate the audio session.
    public func activate() {
        do {
            try AVAudioSession.sharedInstance().setActive(
                true,
                options: .notifyOthersOnDeactivation
            )
            logger.info("Audio session activated")
        } catch {
            logger.error("Failed to activate audio session", error: error)
        }
    }

    /// Deactivate the audio session.
    public func deactivate() {
        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
            logger.info("Audio session deactivated")
        } catch {
            logger.error("Failed to deactivate audio session", error: error)
        }
    }

    // MARK: - Private

    private func configureSession(
        category: AVAudioSession.Category,
        mode: AVAudioSession.Mode,
        options: AVAudioSession.CategoryOptions
    ) {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                category,
                mode: mode,
                options: options
            )
            logger.info(
                "Audio session configured",
                context: [
                    "category": category.rawValue,
                    "mode": mode.rawValue,
                ]
            )
        } catch {
            logger.error("Failed to configure audio session", error: error)
        }
    }
}
