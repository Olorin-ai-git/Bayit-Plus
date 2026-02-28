#if os(tvOS)
    import AVFoundation
    import AVKit
    import SwiftUI

    /// AVPlayerLayer wrapper using resizeAspectFill gravity so the video
    /// fills its frame without the scaleEffect(2) hack that mis-centers faces.
    struct FillVideoLayer: UIViewRepresentable {
        let player: AVPlayer

        func makeUIView(context _: Context) -> UIView {
            let view = PlayerLayerView()
            view.playerLayer.player = player
            view.playerLayer.videoGravity = .resizeAspectFill
            view.backgroundColor = .clear
            return view
        }

        func updateUIView(_ uiView: UIView, context _: Context) {
            guard let view = uiView as? PlayerLayerView else { return }
            view.playerLayer.player = player
        }

        private class PlayerLayerView: UIView {
            override class var layerClass: AnyClass {
                AVPlayerLayer.self
            }

            var playerLayer: AVPlayerLayer {
                layer as! AVPlayerLayer
            }
        }
    }
#endif
