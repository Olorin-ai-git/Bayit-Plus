import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

enum PlusFeature: String, CaseIterable {
    case dubbing, subtitles, search, catchup, talkback
}

/// Contextual card promoting Plus features to free-tier users.
/// Hides itself when the user already has a Plus subscription.
struct PlusFeatureCardView: View {
    let feature: PlusFeature

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        if authManager.user?.subscriptionTier != .plus {
            Button {
                coordinator.navigate(to: .subscription)
            } label: {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(DesignTokens.Warning.default)

                    Text(localization.t("plus.feature.\(feature.rawValue)"))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()

                    HStack(spacing: 4) {
                        Text(localization.t("plus.feature.learnMore"))
                            .font(.system(
                                size: DesignTokens.FontSize.xs,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .padding(DesignTokens.Spacing.md)
                .glassCard(radius: DesignTokens.Radius.md, padding: 0)
            }
            .buttonStyle(.plain)
        }
    }
}
