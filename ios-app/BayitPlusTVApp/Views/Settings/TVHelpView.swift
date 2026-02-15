#if os(tvOS)

import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVHelpView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    @State private var viewModel: HelpViewModel?
    @State private var expandedId: String?

    var body: some View {
        ZStack {
            DesignTokens.Glass.bg
                .ignoresSafeArea()

            if let viewModel {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.error {
                    errorView(error)
                } else {
                    contentView(viewModel)
                }
            }
        }
        .task {
            await initializeViewModel()
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)
            Text(localization.t("settings.help.loading"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.ErrorColor.default)
            Text(error)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func contentView(_ viewModel: HelpViewModel) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                headerSection

                if viewModel.faqs.isEmpty {
                    emptyStateView
                } else {
                    faqSection(viewModel.faqs)
                }

                contactSupportButton
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "questionmark.circle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(DesignTokens.Glass.purpleLight)

                Text(localization.t("settings.help.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Text(localization.t("settings.help.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.bottom, TVDesignTokens.Spacing.md)
    }

    private var emptyStateView: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("settings.help.noFaqs"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func faqSection(_ faqs: [FAQItem]) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(faqs, id: \.id) { faq in
                faqCard(faq)
            }
        }
    }

    private func faqCard(_ faq: FAQItem) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.3)) {
                expandedId = expandedId == faq.id ? nil : faq.id
            }
        } label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack {
                    Text(faq.question ?? "")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.leading)

                    Spacer()

                    Image(systemName: expandedId == faq.id ? "chevron.up" : "chevron.down")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if expandedId == faq.id {
                    Text(faq.answer ?? "")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.leading)
                        .transition(.opacity)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var contactSupportButton: some View {
        Button {
            handleContactSupport()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "envelope.fill")
                    .font(.system(size: TVDesignTokens.FontSize.base))

                Text(localization.t("settings.help.contactSupport"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.purpleLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .padding(.top, TVDesignTokens.Spacing.md)
    }

    private func initializeViewModel() async {
        viewModel = HelpViewModel(
            repository: repos.settings,
            language: localization.currentLanguage.rawValue
        )
        await viewModel?.load()
    }

    private func handleContactSupport() {
        guard let url = URL(string: "mailto:support@bayit.tv") else { return }
        if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
    }
}

#endif
