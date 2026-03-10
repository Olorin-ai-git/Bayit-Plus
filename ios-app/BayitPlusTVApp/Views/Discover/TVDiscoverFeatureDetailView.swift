#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverFeatureDetailView: View {
        let feature: DiscoverFeature
        let viewModel: DiscoverViewModel
        let onDismiss: () -> Void
        @Environment(LocalizationManager.self) private var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @FocusState private var focusedButton: DetailButton?

        private enum DetailButton: Hashable { case tryIt, watchDemo, back }

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                glassPanel
            }
            .onExitCommand(perform: onDismiss)
        }

        private var glassPanel: some View {
            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxl) {
                detailColumn
                mediaColumn
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            .background(DesignTokens.Glass.bgLight)
        }

        private var detailColumn: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                featureHeader
                descriptionText
                prerequisitesList
                actionButtons
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }

        private var featureHeader: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: feature.iconName)
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Primary.default)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t(feature.nameKey))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t(feature.taglineKey))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }

        private var descriptionText: some View {
            Text(localization.t(feature.descriptionKey))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(TVDesignTokens.Spacing.xxs)
                .fixedSize(horizontal: false, vertical: true)
        }

        @ViewBuilder
        private var prerequisitesList: some View {
            let state = viewModel.availability(for: feature.id)
            if case let .setupNeeded(prerequisites) = state {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(localization.t("discover.detail.prerequisites"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    ForEach(prerequisites) { prerequisite in prerequisiteRow(prerequisite) }
                }
                .padding(TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
            }
        }

        private func prerequisiteRow(_ prerequisite: FeaturePrerequisite) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t(prerequisite.labelKey))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                if let url = viewModel.walkthroughURL(for: feature) {
                    focusButton("discover.detail.tryIt", tag: .tryIt,
                                bg: DesignTokens.Primary.default)
                    {
                        viewModel.startWalkthroughSession(for: feature)
                        onDismiss()
                        coordinator.handleDeepLink(url)
                    }
                }
                if viewModel.demoVideoURL(for: feature.id) != nil {
                    focusButton("discover.detail.watchDemo", tag: .watchDemo,
                                bg: DesignTokens.Glass.bgMedium, bordered: true)
                    {
                        onDismiss()
                        if let demoURL = viewModel.demoVideoURL(for: feature.id) {
                            viewModel.pendingDemoVideoURL = demoURL
                        }
                    }
                }
                focusButton("discover.detail.back", tag: .back,
                            bg: DesignTokens.Glass.bg, fg: DesignTokens.Text.secondary) { onDismiss() }
            }
        }

        private func focusButton(
            _ titleKey: String,
            tag: DetailButton,
            bg: Color,
            fg: Color = DesignTokens.Text.primary,
            bordered: Bool = false,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                Text(localization.t(titleKey))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(fg)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                    .overlay(bordered ? RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1) : nil)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(accessibilityId(for: tag))
            .focused($focusedButton, equals: tag)
            .scaleEffect(focusedButton == tag ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .animation(.easeInOut(duration: TVDesignTokens.Focus.animationDuration), value: focusedButton)
        }

        @ViewBuilder
        private var mediaColumn: some View {
            if let thumbnailURL = viewModel.demoThumbnailURL(for: feature.id) {
                AsyncImage(url: thumbnailURL) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable()
                            .aspectRatio(16 / 9, contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                    case .failure:
                        thumbnailFallback
                    case .empty:
                        ProgressView()
                            .tint(DesignTokens.Primary.default)
                            .frame(maxWidth: .infinity, minHeight: TVDesignTokens.MinSize.shelfRowHeight)
                    @unknown default:
                        thumbnailFallback
                    }
                }
                .frame(maxWidth: .infinity)
            } else { thumbnailFallback }
        }

        private func accessibilityId(for button: DetailButton) -> String {
            switch button {
            case .tryIt: "tv_discover_tryIt"
            case .watchDemo: "tv_discover_watchDemo"
            case .back: "tv_discover_back"
            }
        }

        private var thumbnailFallback: some View {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgMedium).aspectRatio(16 / 9, contentMode: .fit)
                .overlay(Image(systemName: feature.iconName)
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted))
                .frame(maxWidth: .infinity)
        }
    }
#endif
