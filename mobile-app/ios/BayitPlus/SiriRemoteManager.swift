#if os(tvOS)
import UIKit
import GameController

class SiriRemoteManager {
    static let shared = SiriRemoteManager()

    var onSwipeRight: (() -> Void)?
    var onSwipeLeft: (() -> Void)?
    var onPlayPause: (() -> Void)?
    var onLongPress: (() -> Void)?
    var onMenu: (() -> Void)?

    private init() {}

    func setupRemoteGestures(for view: UIView) {
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipeRight))
        swipeRight.direction = .right
        swipeRight.allowedPressTypes = [NSNumber(value: UIPress.PressType.select.rawValue)]
        view.addGestureRecognizer(swipeRight)

        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipeLeft))
        swipeLeft.direction = .left
        view.addGestureRecognizer(swipeLeft)

        let playPauseTap = UITapGestureRecognizer(target: self, action: #selector(handlePlayPause))
        playPauseTap.allowedPressTypes = [NSNumber(value: UIPress.PressType.playPause.rawValue)]
        view.addGestureRecognizer(playPauseTap)

        let longPress = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress))
        longPress.minimumPressDuration = 0.5
        view.addGestureRecognizer(longPress)

        let menuPress = UITapGestureRecognizer(target: self, action: #selector(handleMenu))
        menuPress.allowedPressTypes = [NSNumber(value: UIPress.PressType.menu.rawValue)]
        view.addGestureRecognizer(menuPress)
    }

    @objc private func handleSwipeRight() {
        onSwipeRight?()
    }

    @objc private func handleSwipeLeft() {
        onSwipeLeft?()
    }

    @objc private func handlePlayPause() {
        onPlayPause?()
    }

    @objc private func handleLongPress(gesture: UILongPressGestureRecognizer) {
        if gesture.state == .began {
            onLongPress?()
        }
    }

    @objc private func handleMenu() {
        onMenu?()
    }
}
#endif
