import SwiftUI
import WebKit

/// WKWebView-based YouTube player using the IFrame Player API.
/// Provides play/pause/seek control via JS bridge and reports
/// playback state back to SwiftUI via bindings.
struct YouTubeEmbedPlayerView: UIViewRepresentable {
    let videoId: String
    @Binding var currentTime: TimeInterval
    @Binding var duration: TimeInterval
    @Binding var isPlaying: Bool
    @Binding var isReady: Bool
    @Binding var webViewRef: WKWebView?
    var autoPlay: Bool = true

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let handler = context.coordinator
        config.userContentController.add(handler, name: "ytPlayer")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.navigationDelegate = handler

        let html = Self.playerHTML(
            videoId: videoId, autoPlay: autoPlay
        )
        webView.loadHTMLString(html, baseURL: URL(string: "https://bayit.tv"))
        context.coordinator.webView = webView
        DispatchQueue.main.async { self.webViewRef = webView }
        return webView
    }

    func updateUIView(_: WKWebView, context _: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    // MARK: - JS Commands

    static func play(_ webView: WKWebView?) {
        webView?.evaluateJavaScript("player.playVideo()")
    }

    static func pause(_ webView: WKWebView?) {
        webView?.evaluateJavaScript("player.pauseVideo()")
    }

    static func seek(_ webView: WKWebView?, to seconds: TimeInterval) {
        webView?.evaluateJavaScript(
            "player.seekTo(\(seconds), true)"
        )
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject,
        WKScriptMessageHandler, WKNavigationDelegate
    {
        var parent: YouTubeEmbedPlayerView
        weak var webView: WKWebView?
        private var pollTimer: Timer?

        init(parent: YouTubeEmbedPlayerView) {
            self.parent = parent
        }

        func userContentController(
            _: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard let body = message.body as? [String: Any] else { return }
            let event = body["event"] as? String ?? ""

            switch event {
            case "ready":
                DispatchQueue.main.async { self.parent.isReady = true }
                startPolling()

            case "stateChange":
                let state = body["state"] as? Int ?? -1
                DispatchQueue.main.async {
                    self.parent.isPlaying = (state == 1)
                }

            case "timeUpdate":
                let time = body["currentTime"] as? Double ?? 0
                let dur = body["duration"] as? Double ?? 0
                DispatchQueue.main.async {
                    self.parent.currentTime = time
                    self.parent.duration = dur
                }

            default:
                break
            }
        }

        func webView(
            _: WKWebView,
            decidePolicyFor _: WKNavigationAction
        ) async -> WKNavigationActionPolicy {
            .allow
        }

        private func startPolling() {
            pollTimer?.invalidate()
            pollTimer = Timer.scheduledTimer(
                withTimeInterval: 0.5, repeats: true
            ) { [weak self] _ in
                self?.webView?.evaluateJavaScript("""
                    if (typeof player !== 'undefined' && player.getCurrentTime) {
                        window.webkit.messageHandlers.ytPlayer.postMessage({
                            event: 'timeUpdate',
                            currentTime: player.getCurrentTime(),
                            duration: player.getDuration()
                        });
                    }
                """)
            }
        }

        deinit {
            pollTimer?.invalidate()
        }
    }

    // MARK: - HTML Template

    private static func playerHTML(
        videoId: String, autoPlay: Bool
    ) -> String {
        let autoPlayInt = autoPlay ? 1 : 0
        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,\
        maximum-scale=1,user-scalable=no">
        <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: #000;
                     overflow: hidden; }
        #player { width: 100%; height: 100%; }
        </style>
        </head>
        <body>
        <div id="player"></div>
        <script>
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);

        var player;
        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                videoId: '\(videoId)',
                playerVars: {
                    autoplay: \(autoPlayInt),
                    playsinline: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    fs: 0,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    origin: 'https://bayit.tv'
                },
                events: {
                    onReady: function(e) {
                        window.webkit.messageHandlers.ytPlayer.postMessage(
                            { event: 'ready' }
                        );
                    },
                    onStateChange: function(e) {
                        window.webkit.messageHandlers.ytPlayer.postMessage(
                            { event: 'stateChange', state: e.data }
                        );
                    }
                }
            });
        }
        </script>
        </body>
        </html>
        """
    }
}
