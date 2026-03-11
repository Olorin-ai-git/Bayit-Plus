import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Support hub with tabbed interface for FAQ, tickets, and contact.
struct SupportView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
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
                    localization: localization,
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

    private func tabTitle(_ tab: SupportTab) -> String {
        switch tab {
        case .faq: localization.t("support.faq")
        case .tickets: localization.t("support.tickets")
        case .contact: localization.t("support.contact")
        }
    }
}
