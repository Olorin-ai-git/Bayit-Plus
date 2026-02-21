#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Form for creating a personal widget with content type selection.
    /// Non-iframe types use a content picker with browsable thumbnails;
    /// iframe type retains the URL text field.
    struct CreateWidgetView: View {
        let viewModel: WidgetsViewModel
        let onDismiss: () -> Void

        @Environment(RepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) var localization

        @State var title = ""
        @State var description = ""
        @State var selectedContentType: WidgetContentType = .liveChannel
        @State var selectedContent: ContentPickerItem?
        @State var showContentPicker = false
        @State var iframeUrl = ""
        @State var iframeTitle = ""
        @State var isSaving = false
        @State var error: String?
        @State var pickerViewModel: ContentPickerViewModel?
        @State var vodContentId = ""

        private let logger = BayitLogger(category: "CreateWidget")

        let contentTypes: [WidgetContentType] = [
            .liveChannel, .vod, .podcast, .radio, .audiobook, .iframe,
        ]

        /// Content types that support the content picker (not iframe/vod/custom).
        let pickerContentTypes: Set<WidgetContentType> = [
            .liveChannel, .podcast, .radio, .audiobook,
        ]

        var body: some View {
            NavigationStack {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                        titleSection
                        contentTypeSection
                        contentIdSection
                        if let error { errorBanner(error) }
                    }
                    .padding(DesignTokens.Spacing.lg)
                }
                .background(DesignTokens.Background.primary)
                .navigationTitle(localization.t("widgets.createWidget"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(localization.t("common.cancel")) { onDismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        GlassButton(localization.t("common.save"), variant: .primary, size: .small) {
                            Task { await save() }
                        }
                        .disabled(!isFormValid || isSaving)
                    }
                }
                .task {
                    if pickerViewModel == nil {
                        let vm = ContentPickerViewModel(
                            liveTV: repos.liveTV,
                            podcasts: repos.podcasts,
                            radio: repos.radio,
                            audiobook: repos.audiobook
                        )
                        pickerViewModel = vm
                        await vm.loadAll()
                    }
                }
                .sheet(isPresented: $showContentPicker) {
                    if let pickerVM = pickerViewModel {
                        ContentPickerView(viewModel: pickerVM, onSelect: { item in
                            selectedContent = item
                            showContentPicker = false
                        }, onDismiss: {
                            showContentPicker = false
                        })
                        .presentationDetents([.large])
                        .presentationDragIndicator(.visible)
                    }
                }
            }
        }
    }
#endif
