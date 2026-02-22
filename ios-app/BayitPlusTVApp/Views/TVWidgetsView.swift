#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS Widgets gallery with system and personal widgets in a focusable grid.
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
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoadingGallery && vm.availableWidgets.isEmpty && vm.myWidgets.isEmpty {
                        loadingState
                    } else if let error = vm.galleryError, vm.availableWidgets.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.loadAll() }
                        }
                    } else {
                        contentGrid(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = WidgetsViewModel(repository: repos.widget)
                }
                if pickerViewModel == nil {
                    pickerViewModel = ContentPickerViewModel(
                        liveTV: repos.liveTV,
                        podcasts: repos.podcasts,
                        radio: repos.radio,
                        audiobook: repos.audiobook
                    )
                }
                async let widgetsLoad: () = viewModel?.loadAll() ?? ()
                async let pickerLoad: () = pickerViewModel?.loadAll() ?? ()
                _ = await (widgetsLoad, pickerLoad)
            }
            .fullScreenCover(isPresented: $showCreateWidget) {
                if let vm = viewModel, let pickerVM = pickerViewModel {
                    TVCreateWidgetView(
                        widgetsViewModel: vm,
                        pickerViewModel: pickerVM,
                        onDismiss: { showCreateWidget = false }
                    )
                }
            }
        }

        private func contentGrid(_ vm: WidgetsViewModel) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                TVWidgetsPageHeaderView(
                    widgetCount: vm.totalWidgetCount,
                    isDockVisible: coordinator.dockIsVisible,
                    onToggleDock: { coordinator.requestDockToggle = true }
                )

                if !vm.myWidgets.isEmpty {
                    Text(localization.t("widgets.title"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.xl)

                    LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(vm.myWidgets) { widget in
                            widgetCard(widget)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }

                personalWidgetsSection(vm)
            }
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        // MARK: - Personal Widgets Section

        private func personalWidgetsSection(_ vm: WidgetsViewModel) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                HStack {
                    Text(localization.t("widgets.myWidgets"))
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()
                    GlassButton(localization.t("widgets.create"), variant: .primary, size: .small,
                                icon: Image(systemName: "plus")) { showCreateWidget = true }
                        .fixedSize()
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.top, TVDesignTokens.Spacing.lg)

                if vm.personalWidgets.isEmpty && !vm.isLoadingMyWidgets {
                    personalWidgetsEmptyState
                } else {
                    LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(vm.personalWidgets) { widget in
                            widgetCard(widget)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }
            }
        }

        private var personalWidgetsEmptyState: some View {
            Button { showCreateWidget = true } label: {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: "plus.square.dashed")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("widgets.emptyPersonalHint"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, TVDesignTokens.Spacing.xxl)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            }
            .buttonStyle(.card)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        // MARK: - Widget Card

        private func widgetCard(_ widget: WidgetItem) -> some View {
            Button {
                playWidget(widget)
            } label: {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Group {
                        if let urlStr = widget.coverUrl, let url = URL(string: urlStr) {
                            CachedAsyncImage(url: url) { phase in
                                if case let .success(image) = phase {
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } else { widgetIconFallback(widget) }
                            }
                        } else { widgetIconFallback(widget) }
                    }
                    .aspectRatio(16.0 / 9.0, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                    Text(widget.title)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)
                    if let desc = widget.description {
                        Text(desc)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(TVDesignTokens.Spacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .buttonStyle(.card)
        }

        private func widgetIconFallback(_ widget: WidgetItem) -> some View {
            ZStack {
                Rectangle().fill(DesignTokens.Glass.bgStrong)
                Image(systemName: widget.content?.contentType?.iconName ?? "square.grid.2x2")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
        }

        private var loadingState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.5)
                Text(localization.t("widgets.loading"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 400)
        }
    }
#endif
