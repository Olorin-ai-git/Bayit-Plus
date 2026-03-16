import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Household profiles management screen for tvOS.
struct TVHouseholdProfilesView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos

    let onDismiss: () -> Void

    @State var household: Household?
    @State var isLoading = true
    @State var error: String?
    @State var showingInvite = false
    @State var inviteEmail = ""
    @State var isInviting = false
    @FocusState var inviteFieldFocused: Bool

    let maxSlots = 5

    var body: some View {
        Group {
            if isLoading {
                loadingView
            } else if let error {
                errorView(error)
            } else if let household {
                householdContentView(household)
            } else {
                noHouseholdView
            }
        }
        .task { await loadHousehold() }
        .fullScreenCover(isPresented: $showingInvite) {
            inviteSheet
        }
    }

    // MARK: - Loading / Error

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassSpinner(size: .large)
            Text(localization.t("profile.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Button {
                Task { await loadHousehold() }
            } label: {
                Text(localization.t("common.retry"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Data

    func loadHousehold() async {
        isLoading = true
        error = nil
        do {
            household = try await repos.household.fetchHousehold()
        } catch {
            if let apiError = error as? APIError, case .notFound = apiError {
                household = nil
            } else if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }

    func createHousehold() async {
        isLoading = true
        do {
            household = try await repos.household.createHousehold(
                name: localization.t("profile.household")
            )
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isLoading = false
    }

    func inviteMember() async {
        guard let householdId = household?.householdId else { return }
        isInviting = true
        do {
            try await repos.household.inviteMember(
                householdId: householdId,
                email: inviteEmail,
                role: "member"
            )
            showingInvite = false
            inviteEmail = ""
            await loadHousehold()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isInviting = false
    }
}
