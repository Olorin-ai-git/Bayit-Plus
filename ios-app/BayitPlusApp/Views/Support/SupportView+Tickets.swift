import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on SupportView providing ticket and contact tab content.
extension SupportView {
    // MARK: - Tickets

    func ticketsContent(_ vm: SupportViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            newTicketForm(vm)

            if vm.tickets.isEmpty {
                emptyState(icon: "ticket", text: localization.t("support.noTickets"))
            } else {
                ForEach(vm.tickets) { ticket in
                    ticketRow(ticket)
                }
            }
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func newTicketForm(_ vm: SupportViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("support.newTicket"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                GlassTextField(
                    localization.t("support.subject"),
                    text: Bindable(vm).ticketSubject
                )

                GlassTextField(
                    localization.t("support.message"),
                    text: Bindable(vm).ticketMessage
                )

                GlassButton(
                    localization.t("support.submit"),
                    variant: .primary,
                    isDisabled: !vm.canSubmitTicket,
                    isLoading: vm.isSubmitting
                ) {
                    Task { await vm.submitTicket() }
                }

                if vm.ticketCreated {
                    Text(localization.t("support.ticketCreated"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Success.default)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    func ticketRow(_ ticket: SupportTicket) -> some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(ticket.subject ?? "")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(ticket.createdAt ?? "")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                ticketStatusBadge(ticket.status)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Contact

    func contactContent(_: SupportViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            contactRow(icon: "envelope", title: localization.t("support.email"))
            contactRow(icon: "globe", title: localization.t("support.website"))
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func contactRow(icon: String, title: String) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36)
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Helpers

    func emptyState(icon: String, text: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(text)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.top, DesignTokens.Spacing.xxxxl)
    }

    func ticketStatusBadge(_ status: String?) -> some View {
        let variant: GlassBadge.Variant = switch status {
        case "resolved", "closed": .success
        case "open": .warning
        case "in_progress": .primary
        default: .info
        }
        return GlassBadge(text: status ?? "-", variant: variant)
    }
}
