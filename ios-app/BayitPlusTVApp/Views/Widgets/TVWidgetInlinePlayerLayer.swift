#if os(tvOS)
    import AVFoundation
    import SwiftUI

    // MARK: - Inline AVPlayer Layer

    /// Lightweight UIViewRepresentable rendering AVPlayerLayer directly.
    /// Used for inline widget video playback without native transport controls.
    struct InlineAVPlayerLayerView: UIViewRepresentable {
        let player: AVPlayer

        func makeUIView(context _: Context) -> PlayerLayerUIView {
            let view = PlayerLayerUIView()
            view.playerLayer.player = player
            view.playerLayer.videoGravity = .resizeAspectFill
            view.backgroundColor = .black
            return view
        }

        func updateUIView(_ uiView: PlayerLayerUIView, context _: Context) {
            if uiView.playerLayer.player !== player {
                uiView.playerLayer.player = player
            }
        }

        final class PlayerLayerUIView: UIView {
            override class var layerClass: AnyClass {
                AVPlayerLayer.self
            }

            var playerLayer: AVPlayerLayer {
                layer as! AVPlayerLayer
            }
        }
    }

#endif
