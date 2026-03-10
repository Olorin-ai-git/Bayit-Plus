import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverAvatarPrerequisiteView: View {
    let onCreateAvatar: () -> Void
    let onSkip: () -> Void
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(DesignTokens.Typography.largeTitle)
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("discover.walkthrough.avatarNeeded"))
                .font(DesignTokens.Typography.title3)
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            VStack(spacing: DesignTokens.Spacing.md) {
                Button(action: onCreateAvatar) {
                    Text(localization.t("discover.walkthrough.createAvatar"))
                        .font(DesignTokens.Typography.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(DesignTokens.Primary.default)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                }
                .accessibilityIdentifier("discover_create_avatar")

                Button(action: onSkip) {
                    Text(localization.t("discover.walkthrough.skipAvatar"))
                        .font(DesignTokens.Typography.body)
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .accessibilityIdentifier("discover_skip_avatar")
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgStrong)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}
