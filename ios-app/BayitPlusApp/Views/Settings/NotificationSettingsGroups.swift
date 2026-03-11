import BayitDesignSystem
import BayitLocalization
import BayitNotifications
import SwiftUI

/// Permission banner shown when notifications are disabled.
struct NotificationPermissionBanner: View {
    @Environment(LocalizationManager.self) private var localization
    let onEnable: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "bell.slash.circle")
                    .font(.system(size: 40))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("settings.notificationsDisabled"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("settings.notificationsEnableMessage"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassButton(localization.t("settings.enableNotifications")) {
                    onEnable()
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}

/// Toggle group for notification topic subscriptions.
struct NotificationTopicToggles: View {
    let subscribedTopics: Set<NotificationTopic>
    let isLoading: Bool
    let onToggle: (NotificationTopic, Bool) -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(NotificationTopic.allCases, id: \.self) { topic in
                topicToggle(for: topic)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func topicToggle(for topic: NotificationTopic) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: topic.iconName)
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(topic.displayName)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(topic.description)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }

                Spacer()

                Toggle("", isOn: binding(for: topic))
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
                    .disabled(isLoading)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func binding(for topic: NotificationTopic) -> Binding<Bool> {
        Binding(
            get: { subscribedTopics.contains(topic) },
            set: { isSubscribed in
                onToggle(topic, isSubscribed)
            }
        )
    }
}

/// Error banner with dismiss action for notification settings.
struct NotificationErrorBanner: View {
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(.red)

                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Button(localization.t("common.dismiss")) {
                    onDismiss()
                }
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Primary.default)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
