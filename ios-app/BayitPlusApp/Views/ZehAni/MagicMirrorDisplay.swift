import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Display Views (extracted from MagicMirrorView)

extension MagicMirrorView {
    func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                avatarDisplayView(greeting)
                greetingCard(greeting)
                vocabularyCard(greeting)
                HStack(spacing: DesignTokens.Spacing.md) {
                    reRecordButton
                    refreshButton
                }
            }
        }
    }

    // avatarDisplayView, avatarPlaceholder in MagicMirrorView+AvatarDisplay.swift
    // playGreetingButton, greetingCard, vocabularyCard in MagicMirrorView+Content.swift
}
