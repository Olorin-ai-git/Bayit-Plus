import AVFoundation
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Floating widget container that renders actual widget content.
/// Matches the web WidgetContainer layout: header bar with title/buttons + content area.
/// Supports drag repositioning via gesture.
struct PiPWidgetContainerView: View {
    let widget: WidgetItem
    let onMinimize: () -> Void
    let onClose: () -> Void

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization

    @State var playerVM: WidgetPlayerViewModel?
    @State private var position: CGSize = .zero
    @State private var lastPosition: CGSize = .zero

    let containerWidth: CGFloat = 340
    let headerHeight: CGFloat = 40

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            contentArea
        }
        .frame(width: containerWidth)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
        .offset(x: position.width, y: position.height)
        .gesture(dragGesture)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(.trailing, DesignTokens.Spacing.base)
        .padding(.top, 100)
        .transition(.scale.combined(with: .opacity))
        .animation(.spring(duration: 0.3, bounce: 0.15), value: position)
        .task {
            if playerVM == nil {
                playerVM = WidgetPlayerViewModel(
                    mediaRepo: repos.media,
                    contentRepo: repos.content,
                    liveTVRepo: repos.liveTV,
                    radioRepo: repos.radio,
                    podcastRepo: repos.podcasts,
                    audiobookRepo: repos.audiobook
                )
            }
            await playerVM?.resolveCover(for: widget)
        }
        .onDisappear {
            playerVM?.cleanup()
        }
    }

    // MARK: - Video State

    var isVideoActive: Bool {
        guard let vm = playerVM else { return false }
        let ct = widget.content?.contentType
        let isVideo = ct == .liveChannel || ct == .live || ct == .vod
        return isVideo && vm.player.state != .idle
    }

    // MARK: - Drag Gesture

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                position = CGSize(
                    width: lastPosition.width + value.translation.width,
                    height: lastPosition.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastPosition = position
            }
    }
}
