import BayitLocalization
import Foundation
import Observation

/// ViewModel for the Support screen - manages FAQ, tickets, and ticket creation.
@MainActor
@Observable
final class SupportViewModel {
    private(set) var faqItems: [FAQItem] = []
    private(set) var tickets: [SupportTicket] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isSubmitting = false
    private(set) var ticketCreated = false

    var ticketSubject = ""
    var ticketMessage = ""
    var ticketCategory = "general"
    var selectedTab: SupportTab = .faq

    private let repository: any SettingsRepository
    private let localization: LocalizationManager
    private let language: String

    init(repository: any SettingsRepository, localization: LocalizationManager, language: String) {
        self.repository = repository
        self.localization = localization
        self.language = language
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let faqResult = repository.fetchFAQ(language: language)
            async let ticketsResult = repository.fetchTickets(page: 1, limit: 20)
            faqItems = try await faqResult.items
            tickets = try await ticketsResult.tickets
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func submitTicket() async {
        guard !ticketSubject.isEmpty, !ticketMessage.isEmpty else {
            error = localization.t("support.fieldsRequired")
            return
        }

        isSubmitting = true
        error = nil
        ticketCreated = false

        do {
            let request = CreateTicketRequest(
                subject: ticketSubject,
                message: ticketMessage,
                category: ticketCategory,
                priority: "medium",
                language: language
            )
            let ticket = try await repository.createTicket(request: request)
            tickets.insert(ticket, at: 0)
            ticketSubject = ""
            ticketMessage = ""
            ticketCreated = true
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isSubmitting = false
    }

    var canSubmitTicket: Bool {
        !ticketSubject.isEmpty && !ticketMessage.isEmpty && !isSubmitting
    }
}

/// Tabs for the support screen.
enum SupportTab: String, CaseIterable, Sendable {
    case faq
    case tickets
    case contact
}
