import AVKit
import SwiftUI
import UIKit

// MARK: - Video Layer (no controls)

struct SplashVideoLayer: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context _: Context) -> UIView {
        let view = SplashPlayerView()
        view.player = player
        return view
    }

    func updateUIView(_: UIView, context _: Context) {}
}

final class SplashPlayerView: UIView {
    var player: AVPlayer? {
        didSet { playerLayer.player = player }
    }

    override class var layerClass: AnyClass {
        AVPlayerLayer.self
    }

    private var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        playerLayer.videoGravity = .resizeAspectFill
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        nil
    }
}
