import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Support hub with tabbed interface for FAQ, tickets, and contact.
struct SupportView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SupportViewModel?

    var body: some View {
        VStack(spacing: 0) {
            if let vm = viewModel {
                tabBar(vm)
                tabContent(vm)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SupportViewModel(
                    repository: repos.settings,
                    language: localization.currentLanguage.rawValue
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Tab Bar

    private func tabBar(_ vm: SupportViewModel) -> some View {
        HStack(spacing: 0) {
            ForEach(SupportTab.allCases, id: \.rawValue) { tab in
                let isSelected = vm.selectedTab == tab
                Button { vm.selectedTab = tab } label: {
                    Text(tabTitle(tab))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: isSelected ? .semibold : .regular
                        ))
                        .foregroundStyle(
                            isSelected ? DesignTokens.Primary.default : DesignTokens.Text.muted
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                }
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(DesignTokens.Glass.border)
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private func tabContent(_ vm: SupportViewModel) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            switch vm.selectedTab {
            case .faq:
                faqContent(vm)
            case .tickets:
                ticketsContent(vm)
            case .contact:
                contactContent(vm)
            }
        }
    }

    // MARK: - FAQ

    private func faqContent(_ vm: SupportViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            if vm.isLoading {
                ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
            } else if vm.faqItems.isEmpty {
                emptyState(icon: "questionmark.circle", text: localization.t("support.noFAQ"))
            } else {
                ForEach(vm.faqItems) { item in
                    faqRow(item)
                }
            }
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func faqRow(_ item: FAQItem) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(item.question ?? "")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(item.answer ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Tickets

    private func ticketsContent(_ vm: SupportViewModel) -> some View {
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

    private func newTicketForm(_ vm: SupportViewModel) -> some View {
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

    private func ticketRow(_ ticket: SupportTicket) -> some View {
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

    private func contactContent(_ vm: SupportViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            contactRow(icon: "envelope", title: localization.t("support.email"))
            contactRow(icon: "globe", title: localization.t("support.website"))
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func contactRow(icon: String, title: String) -> some View {
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

    private func emptyState(icon: String, text: String) -> some View {
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

    private func tabTitle(_ tab: SupportTab) -> String {
        switch tab {
        case .faq: localization.t("support.faq")
        case .tickets: localization.t("support.tickets")
        case .contact: localization.t("support.contact")
        }
    }

    private func ticketStatusBadge(_ status: String?) -> some View {
        let variant: GlassBadge.Variant = switch status {
        case "resolved", "closed": .success
        case "open": .warning
        case "in_progress": .primary
        default: .info
        }
        return GlassBadge(text: status ?? "-", variant: variant)
    }
}
