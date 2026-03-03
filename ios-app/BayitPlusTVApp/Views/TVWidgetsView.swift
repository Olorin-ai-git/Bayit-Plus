#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS Widgets gallery — groups the user's active widgets by content type,
    /// resolves posters from content libraries, and avoids focus traps via GlassFocusPoster.
    struct TVWidgetsView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: WidgetsViewModel?
        @State private var showCreateWidget = false
        @State private var pickerViewModel: ContentPickerViewModel?

        private let columns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoadingGallery && vm.availableWidgets.isEmpty && vm.myWidgets.isEmpty {
                        loadingState
                    } else if let error = vm.galleryError, vm.availableWidgets.isEmpty {
                        tvErrorState(error) { Task { await vm.loadAll() } }
                    } else {
                        contentGrid(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil { viewModel = WidgetsViewModel(repository: repos.widget) }
                if pickerViewModel == nil {
                    pickerViewModel = ContentPickerViewModel(
                        liveTV: repos.liveTV, podcasts: repos.podcasts,
                        radio: repos.radio, audiobook: repos.audiobook
                    )
                }
                async let w: () = viewModel?.loadAll() ?? ()
                async let p: () = pickerViewModel?.loadAll() ?? ()
                _ = await (w, p)
            }
            .fullScreenCover(isPresented: $showCreateWidget) {
                if let vm = viewModel, let pickerVM = pickerViewModel {
                    TVCreateWidgetView(widgetsViewModel: vm, pickerViewModel: pickerVM,
                                       onDismiss: { showCreateWidget = false })
                }
            }
        }

        // MARK: - Content Grid

        private func contentGrid(_ vm: WidgetsViewModel) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                TVWidgetsPageHeaderView(
                    widgetCount: vm.totalWidgetCount,
                    isDockVisible: coordinator.dockIsVisible,
                    onToggleDock: { coordinator.requestDockToggle = true },
                    onCreateWidget: { showCreateWidget = true }
                )
                ForEach(typeSections(from: vm.myWidgets.filter { $0.type == .system }), id: \.0) { _, label, icon, items in
                    typeSection(label: label, icon: icon, widgets: items)
                }
                if !vm.personalWidgets.isEmpty {
                    personalSection(vm.personalWidgets)
                }
            }
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        // MARK: - Poster Resolution

        private func posterURL(for widget: WidgetItem) -> String? {
            if let url = widget.coverUrl { return url }
            guard let c = widget.content, let picker = pickerViewModel else { return nil }
            switch c.contentType {
            case .liveChannel, .live:
                return picker.channelItems.first { $0.id == c.liveChannelId }?.thumbnailURL?.absoluteString
            case .podcast:
                return picker.podcastItems.first { $0.id == c.podcastId }?.thumbnailURL?.absoluteString
            case .radio:
                return picker.radioItems.first { $0.id == c.stationId }?.thumbnailURL?.absoluteString
            case .audiobook:
                return picker.audiobookItems.first { $0.id == (c.audiobookId ?? c.contentId) }?.thumbnailURL?.absoluteString
            default: return nil
            }
        }

        // MARK: - Grouping

        private typealias TypeSection = (String, String, String, [WidgetItem])

        private func typeSections(from widgets: [WidgetItem]) -> [TypeSection] {
            let order: [(WidgetContentType, String, String)] = [
                (.liveChannel, localization.t("nav.liveTV"), "play.tv"),
                (.podcast, localization.t("nav.listen"), "mic"),
                (.radio, "Radio", "radio"),
                (.vod, localization.t("nav.vod"), "film"),
                (.audiobook, "Audiobooks", "book"),
            ]
            return order.compactMap { type, label, icon in
                let items = widgets.filter {
                    $0.content?.contentType == type
                        || (type == .liveChannel && $0.content?.contentType == .live)
                }
                return items.isEmpty ? nil : (type.rawValue, label, icon, items)
            }
        }

        // MARK: - Section Views

        private func typeSection(label: String, icon: String, widgets: [WidgetItem]) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: icon).foregroundStyle(DesignTokens.Primary.p400)
                    Text(label).font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(widgets) { widget in
                        GlassFocusPoster(
                            thumbnailURL: posterURL(for: widget), title: widget.title,
                            subtitle: widget.description, aspectRatio: 4.0 / 3.0,
                            onSelect: { playWidget(widget) }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .focusSection()
        }

        private func personalSection(_ widgets: [WidgetItem]) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "person.crop.square").foregroundStyle(DesignTokens.Primary.p400)
                    Text(localization.t("widgets.myWidgets"))
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.top, TVDesignTokens.Spacing.lg)
                LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(widgets) { widget in
                        GlassFocusPoster(
                            thumbnailURL: posterURL(for: widget), title: widget.title,
                            subtitle: widget.content?.contentType?.displayLabel,
                            aspectRatio: 4.0 / 3.0, onSelect: { playWidget(widget) }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .focusSection()
        }

        private var loadingState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                Text(localization.t("widgets.loading"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 400)
        }
    }
#endif
