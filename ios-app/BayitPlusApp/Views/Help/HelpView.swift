import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Help Center screen with expandable FAQ sections, contact support button, and version info
struct HelpView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: HelpViewModel?
    @State private var expandedItemId: String?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 100)
                } else if let error = vm.error, vm.faqs.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentView(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = HelpViewModel(
                    repository: repos.settings,
                    language: localization.currentLanguage.rawValue
                )
            }
            await viewModel?.load()
        }
    }

    private func contentView(_ vm: HelpViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.md) {
            // FAQ sections
            if vm.faqs.isEmpty {
                emptyState
            } else {
                ForEach(vm.faqs) { item in
                    faqCard(item)
                }
            }

            // Contact support
            contactSupportSection

            // Version info
            versionInfo
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    private func faqCard(_ item: FAQItem) -> some View {
        let isExpanded = expandedItemId == item.id

        return GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                // Question header
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    withAnimation(.easeInOut(duration: 0.25)) {
                        expandedItemId = isExpanded ? nil : item.id
                    }
                } label: {
                    HStack {
                        Text(item.question ?? "")
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                            .multilineTextAlignment(.leading)

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 14))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    .padding(DesignTokens.Spacing.md)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Toggle answer for: \(item.question ?? "")")

                // Answer (expandable)
                if isExpanded {
                    Divider()
                        .background(DesignTokens.Glass.border)

                    Text(item.answer ?? "")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .padding(DesignTokens.Spacing.md)
                }
            }
        }
    }

    private var contactSupportSection: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 36))
                    .foregroundColor(DesignTokens.Primary.p400)

                Text(localization.t("help.needMoreHelp"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)

                Text(localization.t("help.contactDescription"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassButton(
                    localization.t("help.contactSupport"),
                    variant: .primary,
                    size: .medium
                ) {
                    // Navigate to support view
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.top, DesignTokens.Spacing.md)
    }

    private var versionInfo: some View {
        let version = Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? "-"
        let build = Bundle.main.object(
            forInfoDictionaryKey: "CFBundleVersion"
        ) as? String ?? "-"

        return Text("v\(version) (\(build))")
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundColor(DesignTokens.Text.muted)
            .frame(maxWidth: .infinity)
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "questionmark.circle")
                .font(.system(size: 40))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("help.noFAQ"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(.top, DesignTokens.Spacing.xxxxl)
    }
}
