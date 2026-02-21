#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Contacts Management View

    struct TVContactsView: View {
        @Environment(TVRepositoryProvider.self) private var repos
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
        @FocusState private var addButtonFocused: Bool

        private let relationships = ["grandparent", "parent", "aunt", "uncle", "other"]
        private let languages = ["he", "en", "es", "fr", "ru", "ar", "yi", "de", "pt", "it"]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: 0) {
                    headerSection

                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                            .frame(maxHeight: .infinity)
                    } else if contacts.isEmpty {
                        emptyState
                    } else {
                        contactsList
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                TVContactAddSheet(
                    displayName: $newDisplayName,
                    phoneNumber: $newPhoneNumber,
                    relationship: $newRelationship,
                    language: $newLanguage,
                    pin: $newPin,
                    isSaving: isSaving,
                    error: error,
                    relationships: relationships,
                    languages: languages,
                    onCancel: {
                        showAddSheet = false
                        resetForm()
                    },
                    onSave: {
                        Task { await saveContact() }
                    }
                )
            }
            .task { await loadContacts() }
        }

        private var headerSection: some View {
            HStack {
                Text(localization.t("zehAni.contacts.title"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    showAddSheet = true
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                        Text(localization.t("zehAni.contacts.add"))
                    }
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .buttonStyle(.card)
                .focused($addButtonFocused)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "person.2.slash")
                    .font(.system(size: 120))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("zehAni.contacts.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxHeight: .infinity)
        }

        private var contactsList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(contacts) { contact in
                        TVContactCard(
                            contact: contact,
                            localization: localization,
                            onDelete: { Task { await deleteContact(contact) } }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        @MainActor
        private func loadContacts() async {
            isLoading = true
            error = nil
            do {
                contacts = try await repos.zehAniRepository.listContacts(profileId: profileId)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }

        @MainActor
        private func saveContact() async {
            isSaving = true
            error = nil
            do {
                let newContact = try await repos.zehAniRepository.addContact(
                    profileId: profileId,
                    phoneNumber: newPhoneNumber,
                    displayName: newDisplayName,
                    relationship: newRelationship,
                    language: newLanguage,
                    pin: newPin
                )
                contacts.insert(newContact, at: 0)
                showAddSheet = false
                resetForm()
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }

        @MainActor
        private func deleteContact(_ contact: WhatsAppContactItem) async {
            do {
                _ = try await repos.zehAniRepository.removeContact(contactId: contact.id)
                contacts.removeAll { $0.id == contact.id }
            } catch {
                self.error = error.localizedDescription
            }
        }

        private func resetForm() {
            newDisplayName = ""
            newPhoneNumber = ""
            newRelationship = "grandparent"
            newLanguage = "he"
            newPin = ""
            error = nil
        }
    }

#endif
