import SwiftUI

/// Tab item configuration for GlassTabBar
public struct GlassTab: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let iconName: String
    public let selectedIconName: String?

    public init(
        id: String,
        title: String,
        iconName: String,
        selectedIconName: String? = nil
    ) {
        self.id = id
        self.title = title
        self.iconName = iconName
        self.selectedIconName = selectedIconName
    }
}

/// Glass-styled tab bar matching the @bayit/glass GlassTabs component
public struct GlassTabBar: View {
    let tabs: [GlassTab]
    @Binding var selection: String

    public init(tabs: [GlassTab], selection: Binding<String>) {
        self.tabs = tabs
        self._selection = selection
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xs)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background {
            ZStack {
                Color.black.opacity(0.85)
                VisualEffectBlur()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .padding(.horizontal, DesignTokens.Spacing.base)
        .glassShadow()
    }

    private func tabButton(for tab: GlassTab) -> some View {
        let isSelected = selection == tab.id

        return Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                selection = tab.id
            }
        } label: {
            VStack(spacing: DesignTokens.Spacing.xxs) {
                Image(systemName: isSelected
                    ? (tab.selectedIconName ?? tab.iconName)
                    : tab.iconName)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .symbolVariant(isSelected ? .fill : .none)

                Text(tab.title)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
            }
            .foregroundStyle(isSelected
                ? DesignTokens.Primary.p400
                : DesignTokens.Text.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                isSelected
                    ? DesignTokens.Glass.purpleLight
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }
}
