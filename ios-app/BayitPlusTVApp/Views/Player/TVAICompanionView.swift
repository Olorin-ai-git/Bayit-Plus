#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVAICompanionView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let contentId: String
    let onDismiss: () -> Void

    @State private var viewModel: AICompanionViewModel?
    @FocusState private var focusedTab: AICompanionViewModel.Tab?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                headerSection

                if let vm = viewModel {
                    tabBar(vm)

                    Divider()
                        .background(DesignTokens.Glass.borderLight)

                    contentArea(vm)
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = AICompanionViewModel(repository: repos.chat)
            }
            await viewModel?.loadContent(contentId: contentId)
        }
        .onExitCommand {
            dismiss()
            onDismiss()
        }
    }

    private var headerSection: some View {
        HStack {
            Text(localization.t("aiCompanion.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            GlassButton(localization.t("common.close"), variant: .secondary, size: .medium) {
                dismiss()
                onDismiss()
            }
            .focused($focusedTab, equals: nil)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func tabBar(_ vm: AICompanionViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            ForEach(AICompanionViewModel.Tab.allCases, id: \.rawValue) { tab in
                tabButton(tab, vm: vm)
            }
            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
    }

    private func tabButton(_ tab: AICompanionViewModel.Tab, vm: AICompanionViewModel) -> some View {
        Button {
            vm.selectTab(tab)
            focusedTab = tab
        } label: {
            Text(tab.rawValue)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: vm.selectedTab == tab ? .semibold : .regular))
                .foregroundStyle(vm.selectedTab == tab ? DesignTokens.Primary.p400 : DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    vm.selectedTab == tab
                        ? DesignTokens.Glass.purpleLight
                        : Color.clear
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .focused($focusedTab, equals: tab)
    }

    @ViewBuilder
    private func contentArea(_ vm: AICompanionViewModel) -> some View {
        if vm.isLoading {
            loadingView
        } else if let error = vm.error {
            errorView(error)
        } else {
            switch vm.selectedTab {
            case .context:
                TVCompanionContextTab(viewModel: vm)
            case .quiz:
                TVCompanionQuizTab(viewModel: vm, contentId: contentId)
            case .vocabulary:
                TVCompanionVocabularyTab(viewModel: vm, contentId: contentId)
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 800)

            GlassButton(localization.t("common.retry"), variant: .secondary, size: .large) {
                Task {
                    await viewModel?.loadContent(contentId: contentId)
                }
            }
            .frame(maxWidth: 400)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

extension View {
    func tvFocusStyle() -> some View {
        self.modifier(TVFocusStyleModifier())
    }
}

private struct TVFocusStyleModifier: ViewModifier {
    @Environment(\.isFocused) private var isFocused

    func body(content: Content) -> some View {
        content
            .scaleEffect(isFocused ? 1.05 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}
#endif
