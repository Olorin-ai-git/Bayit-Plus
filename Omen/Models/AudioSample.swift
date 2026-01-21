import Foundation
import AVFoundation

/// Audio sample data model for PCM16 audio processing
struct AudioSample {
    /// Raw PCM16 audio data
    let data: Data

    /// Sample rate in Hz (16000 for OpenAI Realtime API)
    let sampleRate: Double

    /// Number of audio channels (1 for mono)
    let channels: Int

    /// Audio level (0.0 to 1.0) for visualization
    let level: Float

    /// Timestamp when the sample was captured
    let timestamp: Date

    /// Initialize from AVAudioPCMBuffer
    init?(buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else {
            return nil
        }

        let frameLength = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)

        // Convert float samples to Int16 (PCM16)
        var int16Data = [Int16]()
        int16Data.reserveCapacity(frameLength * channelCount)

        var maxLevel: Float = 0.0

        for frame in 0..<frameLength {
            for channel in 0..<channelCount {
                let sample = channelData[channel][frame]
                maxLevel = max(maxLevel, abs(sample))

                // Convert float [-1.0, 1.0] to Int16 [-32768, 32767]
                let int16Value = Int16(max(-32768, min(32767, sample * 32767.0)))
                int16Data.append(int16Value)
            }
        }

        // Convert Int16 array to Data
        self.data = int16Data.withUnsafeBufferPointer { buffer in
            Data(buffer: buffer)
        }

        self.sampleRate = buffer.format.sampleRate
        self.channels = channelCount
        self.level = maxLevel
        self.timestamp = Date()
    }

    /// Initialize with raw data
    init(
        data: Data,
        sampleRate: Double,
        channels: Int,
        level: Float,
        timestamp: Date = Date()
    ) {
        self.data = data
        self.sampleRate = sampleRate
        self.channels = channels
        self.level = level
        self.timestamp = timestamp
    }

    /// Convert to base64-encoded string for transmission
    func toBase64() -> String {
        data.base64EncodedString()
    }
}
