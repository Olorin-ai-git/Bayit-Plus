import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Display Views (extracted from MagicMirrorView)

extension MagicMirrorView {
    func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                if avatars.count > 1 {
                    avatarPickerStrip
                }
                avatarDisplayView(greeting)
                greetingCard(greeting)
                vocabularyCard(greeting)
                HStack(spacing: DesignTokens.Spacing.md) {
                    reRecordButton
                    refreshButton
                    manageAvatarsButton
                }
            }
        }
    }

    var avatarPickerStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(avatars) { avatar in
                    AvatarPickerItem(
                        avatar: avatar,
                        isSelected: avatar.avatarId == selectedAvatarId
                    ) {
                        guard avatar.avatarId != selectedAvatarId else { return }
                        selectedAvatarId = avatar.avatarId
                        loadGreeting()
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
    }

    var manageAvatarsButton: some View {
        GlassButton(
            localization.t("zehAni.avatarManagement.manage"),
            variant: .secondary
        ) {
            showAvatarManagement = true
        }
    }
}
