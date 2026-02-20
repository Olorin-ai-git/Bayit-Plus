import AVFoundation
import SwiftUI

/// UIViewRepresentable using a raw AVPlayerLayer instead of AVPlayerViewController.
/// AVPlayerViewController periodically reclaims focus on tvOS even with
/// showsPlaybackControls=false, breaking SwiftUI focus navigation.
/// AVPlayerLayer has zero focus machinery -- all input goes to SwiftUI.
struct TVVideoPlayerRepresentable: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerLayerView {
        let view = PlayerLayerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        return view
    }

    func updateUIView(_ uiView: PlayerLayerView, context: Context) {
        if uiView.playerLayer.player !== player {
            uiView.playerLayer.player = player
        }
    }
}

/// UIView backed by AVPlayerLayer for video rendering only.
final class PlayerLayerView: UIView {

    override class var layerClass: AnyClass { AVPlayerLayer.self }

    var playerLayer: AVPlayerLayer {
        // swiftlint:disable:next force_cast
        layer as! AVPlayerLayer
    }

    override var canBecomeFocused: Bool { false }
}
