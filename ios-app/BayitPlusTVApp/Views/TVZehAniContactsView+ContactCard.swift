#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Contact Card

    struct TVContactCard: View {
        let contact: WhatsAppContactItem
        let localization: LocalizationManager
        let onDelete: () -> Void

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack {
                        Text(contact.displayName)
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        Text(maskedPhone(contact.phoneNumber))
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: "person.2.fill")
                                .foregroundStyle(DesignTokens.Text.secondary)
                            Text(contact.relationship.capitalized)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }

                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: "globe")
                                .foregroundStyle(DesignTokens.Text.secondary)
                            Text(contact.language.uppercased())
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                    }

                    if contact.totalReelsSent > 0 {
                        reelsSentInfo
                    }
                }

                Button {
                    onDelete()
                } label: {
                    VStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "trash")
                            .font(.system(size: TVDesignTokens.FontSize.xxl))
                        Text(localization.t("zehAni.contacts.delete"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                    }
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .padding(TVDesignTokens.Spacing.md)
                }
                .tvCardStyle()
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private var reelsSentInfo: some View {
            Group {
                Divider()
                    .background(Color.white.opacity(0.1))
                HStack {
                    Text(localization.t("zehAni.contacts.reelCount", ["count": "\(contact.totalReelsSent)"]))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                    Spacer()
                    if let lastSent = contact.lastSentAt {
                        Text(formatDate(lastSent))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }

        private func maskedPhone(_ phone: String) -> String {
            phone.count > 4 ? "***\(String(phone.suffix(4)))" : phone
        }

        private func formatDate(_ dateString: String) -> String {
            guard let date = ISO8601DateFormatter().date(from: dateString) else { return dateString }
            let fmt = DateFormatter()
            fmt.dateStyle = .short
            return fmt.string(from: date)
        }
    }

#endif
