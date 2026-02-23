import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// AI-powered trivia banner overlay - compact glassmorphic design in upper screen area.
/// Slides in/out from trailing edge. Supports AI-detected topics, follow-up chains,
/// related persons, and auto-dismiss progress from the live trivia pipeline.
struct TriviaFactsOverlayView: View {
    @Bindable var viewModel: TriviaFactsViewModel
    let contentId: String
    let currentTime: Double
    let isSubtitlesActive: Bool
    let currentLanguage: String

    @Environment(LocalizationManager.self) var localization
    @State var progressValue: CGFloat = 0
    @State var progressTask: Task<Void, Never>?

    var body: some View {
        GeometryReader { geometry in
            VStack {
                Spacer()
                    .frame(height: bannerTopOffset(containerHeight: geometry.size.height))

                HStack {
                    Spacer()

                    if let fact = viewModel.activeFact {
                        factBanner(fact)
                            .frame(maxWidth: bannerMaxWidth(containerWidth: geometry.size.width))
                            .padding(.trailing, DesignTokens.Spacing.base)
                            .transition(
                                .asymmetric(
                                    insertion: .move(edge: .trailing)
                                        .combined(with: .opacity),
                                    removal: .move(edge: .trailing)
                                        .combined(with: .opacity)
                                )
                            )
                    }
                }

                Spacer()
            }
        }
        .animation(.spring(duration: 0.4, bounce: 0.15), value: viewModel.activeFact?.id)
        .allowsHitTesting(viewModel.activeFact != nil)
        .onChange(of: viewModel.activeFact?.id) { _, newFactId in
            if newFactId != nil {
                startProgressAnimation()
            } else {
                progressTask?.cancel()
                progressValue = 0
            }
        }
        .onDisappear {
            progressTask?.cancel()
        }
    }
}
