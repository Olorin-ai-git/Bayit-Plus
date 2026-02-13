import AVFoundation
import BayitCore
import Foundation
import Observation

@MainActor
@Observable
final class CameraRecordingManager: NSObject {
    private(set) var isRecording = false
    private(set) var recordedVideoURL: URL?
    private(set) var error: String?
    private(set) var captureSession: AVCaptureSession?

    private var movieOutput: AVCaptureMovieFileOutput?
    private var recordingDelegate: RecordingDelegate?
    private let logger = BayitLogger(category: "CameraRecordingManager")

    var isSessionRunning: Bool { captureSession?.isRunning ?? false }

    func setupSession() {
        let session = AVCaptureSession()
        session.sessionPreset = .medium

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let cameraInput = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(cameraInput) else {
            error = "camera_unavailable"
            logger.error("Front camera unavailable")
            return
        }
        session.addInput(cameraInput)

        if let mic = AVCaptureDevice.default(for: .audio),
           let micInput = try? AVCaptureDeviceInput(device: mic),
           session.canAddInput(micInput) {
            session.addInput(micInput)
        }

        let output = AVCaptureMovieFileOutput()
        guard session.canAddOutput(output) else {
            error = "output_unavailable"
            logger.error("Cannot add movie file output")
            return
        }
        session.addOutput(output)
        movieOutput = output

        captureSession = session
        logger.info("Camera session configured")
    }

    func startSession() {
        guard let session = captureSession, !session.isRunning else { return }
        Task.detached { [session] in
            session.startRunning()
        }
    }

    func stopSession() {
        guard let session = captureSession, session.isRunning else { return }
        Task.detached { [session] in
            session.stopRunning()
        }
    }

    func startRecording() {
        guard let output = movieOutput, !isRecording else { return }

        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(UUID().uuidString + ".mp4")

        let delegate = RecordingDelegate { [weak self] url, recordingError in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isRecording = false
                self.recordingDelegate = nil
                if let recordingError {
                    self.error = recordingError.localizedDescription
                    self.logger.error("Recording failed", error: recordingError)
                } else {
                    self.recordedVideoURL = url
                    self.logger.info("Recording saved to \(url?.lastPathComponent ?? "nil")")
                }
            }
        }
        recordingDelegate = delegate
        output.startRecording(to: fileURL, recordingDelegate: delegate)
        isRecording = true
        logger.info("Recording started")
    }

    func stopRecording() {
        movieOutput?.stopRecording()
    }

    func clearRecording() {
        if let url = recordedVideoURL {
            try? FileManager.default.removeItem(at: url)
        }
        recordedVideoURL = nil
        error = nil
    }
}

private final class RecordingDelegate: NSObject, AVCaptureFileOutputRecordingDelegate {
    private let completion: (URL?, Error?) -> Void

    init(completion: @escaping (URL?, Error?) -> Void) {
        self.completion = completion
    }

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didFinishRecordingTo outputFileURL: URL,
        from connections: [AVCaptureConnection],
        error: Error?
    ) {
        completion(error == nil ? outputFileURL : nil, error)
    }
}
