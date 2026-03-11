import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNotifications
import SwiftUI

// MARK: - Topic Toggle & Error Banner

extension NotificationSettingsView {
    // MARK: - Permission Banner

    var permissionBanner: some View {
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
                    showPermissionAlert = true
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Topic Toggles

    var topicToggles: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(NotificationTopic.allCases, id: \.self) { topic in
                topicToggle(for: topic)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func topicToggle(for topic: NotificationTopic) -> some View {
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

    func errorBanner(_ message: String) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(.red)

                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Button(localization.t("common.dismiss")) {
                    error = nil
                }
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Primary.default)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Data Loading

    func loadPermissionStatus() async {
        guard let pushService = pushService else {
            hasPermission = false
            return
        }

        let status = await pushService.checkPermissionStatus()
        hasPermission = status == .authorized || status == .provisional

        logger.info("Loaded permission status", context: [
            "hasPermission": "\(hasPermission)",
            "status": "\(status.rawValue)",
        ])
    }

    func loadSubscriptions() async {
        let defaults = NotificationTopic.allCases.filter { $0.isDefaultSubscription }
        subscribedTopics = Set(defaults)

        logger.info("Loaded subscriptions", context: [
            "count": "\(subscribedTopics.count)",
        ])
    }

    func toggleSubscription(for topic: NotificationTopic, subscribe: Bool) async {
        guard let pushService = pushService else { return }

        isLoading = true
        error = nil

        do {
            if subscribe {
                try await pushService.subscribe(to: topic)
                subscribedTopics.insert(topic)
                logger.info("Subscribed to topic", context: ["topic": topic.rawValue])
            } else {
                try await pushService.unsubscribe(from: topic)
                subscribedTopics.remove(topic)
                logger.info("Unsubscribed from topic", context: ["topic": topic.rawValue])
            }
        } catch {
            self.error = localization.t("settings.subscriptionUpdateFailed")
            logger.error("Failed to toggle subscription", error: error, context: [
                "topic": topic.rawValue,
                "action": subscribe ? "subscribe" : "unsubscribe",
            ])
        }

        isLoading = false
    }
}
