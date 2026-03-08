import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized Listen screen with wider grid layouts for podcasts/radio/audiobooks
struct IPadListenView: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var selectedTab: ListenTab = .podcasts

    var body: some View {
        VStack(spacing: 0) {
            header
            tabContent
        }
        .background(DesignTokens.Background.primary)
    }

    private var header: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            PageHeader(icon: "headphones", title: localization.t("listen.title"))
            tabSelector
        }
    }

    private var tabSelector: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(ListenTab.allCases) { tab in
                GlassChip(
                    title: tab.title(localization),
                    isSelected: selectedTab == tab
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab
                    }
                }
            }
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .podcasts:
            PodcastsListenTab()
        case .radio:
            RadioListenTab()
        case .audiobooks:
            AudiobooksListenTab()
        }
    }
}
