#if os(iOS)
    import BayitDesignSystem
    import SwiftUI

    /// Extension on PlayerView providing the cultural context badge row overlay
    /// for VOD content. Detection is triggered from handleTimeChange via the
    /// active subtitle cue text. The explanation sheet is declared in PlayerView.swift.
    extension PlayerView {
        // MARK: - Cultural Context Overlay

        /// A horizontal scrollable row of CulturalContextBadge pills anchored above
        /// the subtitle area. Only visible for VOD content when references are detected.
        @ViewBuilder
        var culturalContextOverlay: some View {
            if let vm = culturalContextVM, !vm.references.isEmpty, !mediaContentType.isLive {
                VStack {
                    Spacer()
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            ForEach(vm.references) { ref in
                                CulturalContextBadge(
                                    referenceName: ref.canonicalName,
                                    isSelected: vm.selectedReference?.id == ref.id
                                ) {
                                    vm.selectReference(ref)
                                }
                            }
                        }
                        .padding(.horizontal, DesignTokens.Spacing.md)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, DesignTokens.Spacing.xxl)
                }
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .allowsHitTesting(true)
                .walkthroughTarget(id: "discover_cultural_context_step1")
            }
        }
    }
#endif
