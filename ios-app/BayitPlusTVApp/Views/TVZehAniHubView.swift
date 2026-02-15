#if os(tvOS)
import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Zeh Ani hub for tvOS - consolidates interactive and social features.
/// Sub-sections: Avatar, Watch Party, Trivia, Chess, AI Chat, Rewards, Beta Credits.
struct TVZehAniHubView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(TVRepositoryProvider.self) private var repos

    @State private var profileId: String?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                } else if let error = error {
                    errorView(message: error)
                } else if let profileId = profileId {
                    hubContent(profileId: profileId)
                }
            }
            .task {
                await loadProfile()
            }
        }
    }

    @ViewBuilder
    private func hubContent(profileId: String) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                featureList(profileId: profileId)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
        }
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Button {
                Task { await loadProfile() }
            } label: {
                Text(localization.t("common.retry"))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "person.fill.viewfinder")
                .font(.system(size: 64))
                .foregroundStyle(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("Zeh Ani")
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("zehAni.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func featureList(profileId: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            featureCard(
                icon: "wand.and.stars",
                title: localization.t("zehAni.hub.magicMirror"),
                subtitle: localization.t("zehAni.hub.magicMirrorDesc")
            ) {
                TVMagicMirrorView(profileId: profileId)
            }

            featureCard(
                icon: "film.fill",
                title: localization.t("zehAni.hub.highlights"),
                subtitle: localization.t("zehAni.hub.highlightsDesc")
            ) {
                TVHighlightsView(profileId: profileId)
            }

            featureCard(
                icon: "person.2.fill",
                title: localization.t("zehAni.hub.contacts"),
                subtitle: localization.t("zehAni.hub.contactsDesc")
            ) {
                TVContactsView(profileId: profileId)
            }

            featureCard(
                icon: "tray.full.fill",
                title: localization.t("zehAni.hub.feedback"),
                subtitle: localization.t("zehAni.hub.feedbackDesc")
            ) {
                TVFeedbackView(profileId: profileId)
            }
        }
    }

    @MainActor
    private func loadProfile() async {
        isLoading = true
        error = nil
        do {
            let profile = try await repos.user.fetchProfile()
            profileId = profile.id
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    private func featureCard<Destination: View>(
        icon: String,
        title: String,
        subtitle: String,
        @ViewBuilder destination: @escaping () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .frame(width: 60)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.xl)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
// MARK: - Highlight Reels View

struct TVHighlightsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var reels: [HighlightReelItem] = []
    @State private var isLoading = false
    @State private var isGenerating = false
    @State private var error: String?
    @FocusState private var generateButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                headerSection

                if let error = error {
                    errorDisplay(error)
                }

                if isGenerating {
                    generatingFeedback
                }

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                        .frame(maxHeight: .infinity)
                } else if reels.isEmpty {
                    emptyState
                } else {
                    reelsList
                }
            }
        }
        .task { await loadReels() }
    }

    private var headerSection: some View {
        HStack {
            Text(localization.t("zehAni.highlights.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                Task { await generateReel() }
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "plus.circle.fill")
                    Text(localization.t("zehAni.highlights.generate"))
                }
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .focused($generateButtonFocused)
            .disabled(isGenerating)
            .opacity(isGenerating ? 0.5 : 1.0)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func errorDisplay(_ message: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(DesignTokens.ErrorColor.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.ErrorColor.default)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.ErrorColor.default.opacity(0.1))
        .cornerRadius(TVDesignTokens.Radius.md)
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var generatingFeedback: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Text(localization.t("zehAni.highlights.generating"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Primary.default.opacity(0.1))
        .cornerRadius(TVDesignTokens.Radius.md)
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "film.stack")
                .font(.system(size: 120))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("zehAni.highlights.empty"))
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxHeight: .infinity)
    }

    private var reelsList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(reels) { reel in
                    reelCard(reel)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func reelCard(_ reel: HighlightReelItem) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            if let thumbnailUrl = reel.thumbnailUrl {
                AsyncImage(url: URL(string: thumbnailUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    DesignTokens.Glass.bgMedium
                }
                .frame(width: 160, height: 160)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            } else {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(width: 160, height: 160)
                    .overlay {
                        Image(systemName: "video.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("zehAni.highlights.momentCount", ["count": "\(reel.momentCount)"]))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Circle()
                        .fill(statusColor(reel.status))
                        .frame(width: 12, height: 12)
                    Text(statusText(reel.status))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(statusColor(reel.status))
                }

                Text(formatDate(reel.createdAt))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()

            if reel.shareToken != nil, reel.status == "completed" {
                Button {
                    shareReel(reel)
                } label: {
                    VStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: TVDesignTokens.FontSize.xxl))
                        Text(localization.t("common.share"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                    }
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(TVDesignTokens.Spacing.md)
                }
                .buttonStyle(.card)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    @MainActor
    private func loadReels() async {
        isLoading = true
        error = nil
        do {
            reels = try await repos.zehAniRepository.listHighlightReels(profileId: profileId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func generateReel() async {
        isGenerating = true
        error = nil
        do {
            let newReel = try await repos.zehAniRepository.generateHighlightReel(profileId: profileId)
            reels.insert(newReel, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
        isGenerating = false
    }

    private func shareReel(_ reel: HighlightReelItem) {
        guard let shareToken = reel.shareToken else { return }
        let webHost = repos.configuration.environment == .production ? "bayit.tv" : "staging.bayit.tv"
        let shareUrl = "https://\(webHost)/zeh-ani/reels/\(shareToken)"
    }

    private func statusText(_ status: String) -> String {
        localization.t("zehAni.highlights.status.\(status)")
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return DesignTokens.Success.default
        case "processing": return DesignTokens.Warning.default
        case "failed": return DesignTokens.ErrorColor.default
        default: return DesignTokens.Text.secondary
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

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
        .sheet(isPresented: $showAddSheet) { addContactSheet }
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
                    contactCard(contact)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func contactCard(_ contact: WhatsAppContactItem) -> some View {
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

            Button {
                Task { await deleteContact(contact) }
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
            .buttonStyle(.card)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    private var addContactSheet: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Text(localization.t("zehAni.contacts.add"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    TextField(localization.t("zehAni.contacts.name"), text: $newDisplayName)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .padding(TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .cornerRadius(TVDesignTokens.Radius.md)

                    TextField(localization.t("zehAni.contacts.phone"), text: $newPhoneNumber)
                        .keyboardType(.phonePad)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .padding(TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .cornerRadius(TVDesignTokens.Radius.md)

                    Menu {
                        ForEach(relationships, id: \.self) { rel in
                            Button(rel.capitalized) {
                                newRelationship = rel
                            }
                        }
                    } label: {
                        HStack {
                            Text(newRelationship.capitalized)
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                            Spacer()
                            Image(systemName: "chevron.down")
                        }
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .cornerRadius(TVDesignTokens.Radius.md)
                    }

                    Menu {
                        ForEach(languages, id: \.self) { lang in
                            Button(lang.uppercased()) {
                                newLanguage = lang
                            }
                        }
                    } label: {
                        HStack {
                            Text(newLanguage.uppercased())
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                            Spacer()
                            Image(systemName: "chevron.down")
                        }
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .cornerRadius(TVDesignTokens.Radius.md)
                    }

                    SecureField(localization.t("zehAni.contacts.pin"), text: $newPin)
                        .keyboardType(.numberPad)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .padding(TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .cornerRadius(TVDesignTokens.Radius.md)
                }

                if let error = error {
                    Text(error)
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                }

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Button {
                        showAddSheet = false
                        resetForm()
                    } label: {
                        Text(localization.t("common.cancel"))
                            .frame(maxWidth: .infinity)
                            .padding(TVDesignTokens.Spacing.lg)
                    }
                    .buttonStyle(.card)

                    Button {
                        Task { await saveContact() }
                    } label: {
                        Text(localization.t("common.save"))
                            .frame(maxWidth: .infinity)
                            .padding(TVDesignTokens.Spacing.lg)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isSaving || newDisplayName.isEmpty || newPhoneNumber.isEmpty || newPin.isEmpty)
                }
            }
            .padding(TVDesignTokens.Spacing.xxxl)
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

// MARK: - Feedback Inbox View

struct TVFeedbackView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var feedback: [FeedbackItem] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var playingAudioId: String?
    @State private var audioPlayer: AVPlayer?
    @FocusState private var refreshButtonFocused: Bool

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
                } else if feedback.isEmpty {
                    emptyState
                } else {
                    feedbackList
                }
            }
        }
        .task { await loadFeedback() }
        .onDisappear {
            audioPlayer?.pause()
            audioPlayer = nil
            playingAudioId = nil
        }
    }

    private var headerSection: some View {
        HStack {
            Text(localization.t("zehAni.feedback.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                Task { await loadFeedback() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .padding(TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .focused($refreshButtonFocused)
            .disabled(isLoading)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "envelope.open")
                .font(.system(size: 120))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("zehAni.feedback.empty"))
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxHeight: .infinity)
    }

    private var feedbackList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(feedback) { item in
                    feedbackCard(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func feedbackCard(_ item: FeedbackItem) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("zehAni.feedback.from"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text(item.contactName)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Text(formatDate(item.createdAt))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if item.audioUrl != nil {
                audioPlaybackButton(item)
            }

            if let transcript = item.transcriptText, !transcript.isEmpty {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("zehAni.feedback.voiceMessage"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.muted)
                    Text(transcript)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(DesignTokens.Glass.bgLight)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
            }

            if let language = item.detectedLanguage {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "globe")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(language.uppercased())
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    private func audioPlaybackButton(_ item: FeedbackItem) -> some View {
        Button {
            toggleAudioPlayback(item)
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: playingAudioId == item.id ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Primary.default)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("zehAni.feedback.voiceMessage"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        ForEach(0..<5) { index in
                            Circle()
                                .fill(playingAudioId == item.id ? DesignTokens.Primary.default : DesignTokens.Text.muted)
                                .frame(width: 6, height: 6)
                                .scaleEffect(playingAudioId == item.id && index % 2 == 0 ? 1.2 : 1.0)
                                .animation(
                                    playingAudioId == item.id
                                        ? .easeInOut(duration: 0.6).repeatForever(autoreverses: true)
                                        : .default,
                                    value: playingAudioId
                                )
                        }
                    }
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
    }

    @MainActor
    private func loadFeedback() async {
        isLoading = true
        error = nil
        do {
            feedback = try await repos.zehAniRepository.getFeedbackHistory(profileId: profileId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func toggleAudioPlayback(_ item: FeedbackItem) {
        if playingAudioId == item.id {
            audioPlayer?.pause()
            audioPlayer = nil
            playingAudioId = nil
        } else {
            playingAudioId = item.id
            if let audioUrl = item.audioUrl {
                playAudio(from: audioUrl)
            }
        }
    }

    private func playAudio(from urlString: String) {
        guard let url = URL(string: urlString) else { return }
        audioPlayer = AVPlayer(url: url)
        audioPlayer?.play()

        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: audioPlayer?.currentItem,
            queue: .main
        ) { [weak audioPlayer] _ in
            audioPlayer?.seek(to: .zero)
            playingAudioId = nil
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

#endif
