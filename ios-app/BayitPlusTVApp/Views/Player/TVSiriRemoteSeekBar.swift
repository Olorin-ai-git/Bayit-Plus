import SwiftUI
import UIKit

/// Transparent overlay that captures Siri Remote touchpad pan gestures for video scrubbing.
/// The Siri Remote touchpad fires UIPanGestureRecognizer with allowedTouchTypes = [.indirect].
/// onMoveCommand only handles discrete D-pad events; continuous drag requires this approach.
struct TVSiriRemoteSeekBar: UIViewRepresentable {
    let duration: TimeInterval
    let currentTime: TimeInterval
    let onScrubChanged: (TimeInterval) -> Void
    let onScrubEnded: () -> Void

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear
        let pan = UIPanGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handlePan(_:))
        )
        pan.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.indirect.rawValue)]
        view.addGestureRecognizer(pan)
        return view
    }

    func updateUIView(_: UIView, context: Context) {
        context.coordinator.duration = duration
        context.coordinator.currentTime = currentTime
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(
            duration: duration,
            currentTime: currentTime,
            onScrubChanged: onScrubChanged,
            onScrubEnded: onScrubEnded
        )
    }

    final class Coordinator: NSObject {
        var duration: TimeInterval
        var currentTime: TimeInterval
        private let onScrubChanged: (TimeInterval) -> Void
        private let onScrubEnded: () -> Void
        private var scrubStartTime: TimeInterval = 0

        init(
            duration: TimeInterval,
            currentTime: TimeInterval,
            onScrubChanged: @escaping (TimeInterval) -> Void,
            onScrubEnded: @escaping () -> Void
        ) {
            self.duration = duration
            self.currentTime = currentTime
            self.onScrubChanged = onScrubChanged
            self.onScrubEnded = onScrubEnded
        }

        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            guard let view = gesture.view else { return }
            let width = max(view.bounds.width, 1)

            switch gesture.state {
            case .began:
                let touchFraction = Double(gesture.location(in: view).x / width)
                scrubStartTime = max(0, min(duration, touchFraction * duration))
                onScrubChanged(scrubStartTime)
            case .changed:
                let dx = gesture.translation(in: view).x
                let delta = Double(dx / width) * duration
                let target = max(0, min(duration, scrubStartTime + delta))
                onScrubChanged(target)
            case .ended, .cancelled:
                onScrubEnded()
            default:
                break
            }
        }
    }
}
