#if os(tvOS)
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Standalone tab wrapper for TVPreferencesView.
    /// Loads profile data from repositories so it works
    /// without being launched from the Profile sheet.
    struct TVPreferencesTabView: View {
        @Environment(AuthManager.self) var authManager
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization

        @State private var viewModel: ProfileViewModel?

        var body: some View {
            Group {
                if let vm = viewModel, let profile = vm.profile {
                    TVPreferencesView(
                        preferences: profile.preferences,
                        viewModel: vm,
                        onDismiss: {}
                    )
                } else {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(
                            maxWidth: .infinity,
                            maxHeight: .infinity
                        )
                        .background(DesignTokens.Background.primary)
                }
            }
            .task {
                if viewModel == nil {
                    viewModel = ProfileViewModel(
                        repository: repos.user
                    )
                }
                await viewModel?.load()
            }
        }
    }
#endif
