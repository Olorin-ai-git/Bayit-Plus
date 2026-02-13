import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct ContactsManagementView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var contacts: [WhatsAppContactItem] = []
    @State private var isLoading = false
    @State private var showAddSheet = false
    @State private var error: String?
    @State private var newDisplayName = ""
    @State private var newPhoneNumber = ""
    @State private var newRelationship = "grandparent"
    @State private var newLanguage = "he"
    @State private var newPin = ""
    @State private var isSaving = false

    private let relationships = ["grandparent", "parent", "aunt", "uncle", "other"]
    private let languages = ["he", "en", "es", "fr", "ru", "ar", "yi", "de", "pt", "it"]

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                ZehAniBreadcrumb(currentLabel: "Contacts")

                HStack {
                    Text(localization.t("zehAni.contacts.title"))
                        .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                    Button {
                        showAddSheet = true
                    } label: {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "plus.circle.fill")
                            Text(localization.t("zehAni.contacts.add"))
                        }
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.top, DesignTokens.Spacing.lg)

                if isLoading {
                    ProgressView().tint(DesignTokens.Primary.default).frame(maxHeight: .infinity)
                } else if contacts.isEmpty {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        Image(systemName: "person.2.slash").font(.system(size: DesignTokens.FontSize.hero))
                            .foregroundColor(DesignTokens.Text.muted)
                        Text(localization.t("zehAni.contacts.empty")).foregroundColor(DesignTokens.Text.secondary)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: DesignTokens.Spacing.md) {
                            ForEach(contacts) { contact in
                                contactCard(contact)
                                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                        Button(role: .destructive) {
                                            Task { await deleteContact(contact) }
                                        } label: {
                                            Label(localization.t("zehAni.contacts.delete"), systemImage: "trash")
                                        }
                                    }
                            }
                        }
                        .padding(.horizontal, DesignTokens.Spacing.base)
                        .padding(.vertical, DesignTokens.Spacing.lg)
                    }
                }
            }
        }
        .sheet(isPresented: $showAddSheet) { addContactSheet }
        .task { await loadContacts() }
    }

    private func contactCard(_ contact: WhatsAppContactItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(contact.displayName).font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Text(maskedPhone(contact.phoneNumber)).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "person.2.fill").foregroundColor(DesignTokens.Text.secondary)
                Text(contact.relationship.capitalized).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "globe").foregroundColor(DesignTokens.Text.secondary)
                Text(contact.language.uppercased()).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            if contact.totalReelsSent > 0 {
                Divider().background(Color.white.opacity(0.1))
                HStack {
                    Text(localization.t("zehAni.contacts.reelCount", ["count": "\(contact.totalReelsSent)"])).font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                    Spacer()
                    if let lastSent = contact.lastSentAt {
                        Text(formatDate(lastSent)).font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
    }

    private var addContactSheet: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                VStack(spacing: DesignTokens.Spacing.lg) {
                    TextField(localization.t("zehAni.contacts.name"), text: $newDisplayName)
                        .textFieldStyle(.roundedBorder)
                    TextField(localization.t("zehAni.contacts.phone"), text: $newPhoneNumber)
                        .keyboardType(.phonePad).textFieldStyle(.roundedBorder)
                    Menu { ForEach(relationships, id: \.self) { Button($0.capitalized) { newRelationship = $0 } } } label: {
                        HStack { Text(newRelationship.capitalized); Spacer(); Image(systemName: "chevron.down") }
                            .padding(DesignTokens.Spacing.sm).background(DesignTokens.Glass.bg)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                    }
                    Menu { ForEach(languages, id: \.self) { Button($0.uppercased()) { newLanguage = $0 } } } label: {
                        HStack { Text(newLanguage.uppercased()); Spacer(); Image(systemName: "chevron.down") }
                            .padding(DesignTokens.Spacing.sm).background(DesignTokens.Glass.bg)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                    }
                    SecureField(localization.t("zehAni.contacts.pin"), text: $newPin)
                        .keyboardType(.numberPad).textFieldStyle(.roundedBorder)
                    if let error = error {
                        Text(error).foregroundColor(DesignTokens.ErrorColor.default).font(.system(size: DesignTokens.FontSize.sm))
                    }
                    Button { Task { await saveContact() } } label: {
                        Text(localization.t("common.save")).frame(maxWidth: .infinity).padding(DesignTokens.Spacing.md)
                    }
                    .disabled(isSaving || newDisplayName.isEmpty || newPhoneNumber.isEmpty || newPin.isEmpty).buttonStyle(.borderedProminent)
                }
                .padding(DesignTokens.Spacing.xl)
            }
            .navigationTitle(localization.t("zehAni.contacts.add")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(localization.t("common.close")) { showAddSheet = false; resetForm() } } }
        }
    }

    @MainActor
    private func loadContacts() async {
        isLoading = true; error = nil
        do { contacts = try await repos.zehAniRepository.listContacts(profileId: profileId) }
        catch { self.error = error.localizedDescription }
        isLoading = false
    }

    @MainActor
    private func saveContact() async {
        isSaving = true; error = nil
        do {
            let newContact = try await repos.zehAniRepository.addContact(
                profileId: profileId, phoneNumber: newPhoneNumber, displayName: newDisplayName,
                relationship: newRelationship, language: newLanguage, pin: newPin
            )
            contacts.insert(newContact, at: 0); showAddSheet = false; resetForm()
        } catch { self.error = error.localizedDescription }
        isSaving = false
    }

    @MainActor
    private func deleteContact(_ contact: WhatsAppContactItem) async {
        do { _ = try await repos.zehAniRepository.removeContact(contactId: contact.id); contacts.removeAll { $0.id == contact.id } }
        catch { self.error = error.localizedDescription }
    }

    private func resetForm() {
        newDisplayName = ""; newPhoneNumber = ""; newRelationship = "grandparent"; newLanguage = "he"; newPin = ""; error = nil
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
