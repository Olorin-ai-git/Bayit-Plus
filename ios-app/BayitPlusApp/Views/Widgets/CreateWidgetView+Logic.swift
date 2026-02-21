#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Validation, Save, and Helpers

    extension CreateWidgetView {
        var isFormValid: Bool {
            let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedTitle.isEmpty else { return false }

            if selectedContentType == .iframe {
                let trimmedUrl = iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                return trimmedUrl.hasPrefix("http://") || trimmedUrl.hasPrefix("https://")
            } else if pickerContentTypes.contains(selectedContentType) {
                return selectedContent != nil
            } else {
                return !vodContentId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }
        }

        func save() async {
            guard isFormValid else { return }
            isSaving = true
            error = nil

            let content: WidgetContentPayload

            if selectedContentType == .iframe {
                content = WidgetContentPayload(
                    contentType: selectedContentType.rawValue,
                    liveChannelId: nil,
                    podcastId: nil,
                    contentId: nil,
                    stationId: nil,
                    audiobookId: nil,
                    iframeUrl: iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines),
                    iframeTitle: iframeTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            } else if let selected = selectedContent {
                content = WidgetContentPayload(
                    contentType: selected.tab.widgetContentType.rawValue,
                    liveChannelId: selected.tab == .channels ? selected.id : nil,
                    podcastId: selected.tab == .podcasts ? selected.id : nil,
                    contentId: nil,
                    stationId: selected.tab == .radio ? selected.id : nil,
                    audiobookId: selected.tab == .audiobooks ? selected.id : nil,
                    iframeUrl: nil,
                    iframeTitle: nil
                )
            } else {
                let trimmedId = vodContentId.trimmingCharacters(in: .whitespacesAndNewlines)
                content = WidgetContentPayload(
                    contentType: selectedContentType.rawValue,
                    liveChannelId: nil,
                    podcastId: nil,
                    contentId: trimmedId,
                    stationId: nil,
                    audiobookId: nil,
                    iframeUrl: nil,
                    iframeTitle: nil
                )
            }

            let request = CreateWidgetRequest(
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? nil
                    : description.trimmingCharacters(in: .whitespacesAndNewlines),
                icon: nil,
                content: content
            )

            let success = await viewModel.createPersonalWidget(request)
            if success {
                onDismiss()
            } else {
                error = "Failed to create widget"
            }
            isSaving = false
        }

        func syncPickerTab(for contentType: WidgetContentType) {
            switch contentType {
            case .liveChannel, .live: pickerViewModel?.selectedTab = .channels
            case .podcast: pickerViewModel?.selectedTab = .podcasts
            case .radio: pickerViewModel?.selectedTab = .radio
            case .audiobook: pickerViewModel?.selectedTab = .audiobooks
            default: break
            }
        }
    }
#endif
