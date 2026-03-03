#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitVoice
    import SwiftUI

    /// tvOS full-screen voice search with animated microphone and focusable suggestions.
    struct TVVoiceSearchView: View {
        let audioService: TVAudioRecordingService
        let onResult: (String) -> Void
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization
        @State private var transcript = ""
        @State private var isRecording = false
        @State private var suggestions: [String] = []
        @FocusState private var focusedSuggestion: String?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xxl) {
                    microphoneSection
                    transcriptSection
                    suggestionsSection
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.xxl)
            }
            .onExitCommand { onDismiss() }
        }

        // MARK: - Microphone

        private var microphoneSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                ZStack {
                    waveformBackground
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [micColor.opacity(0.6), micColor.opacity(0.15)],
                                center: .center,
                                startRadius: 0,
                                endRadius: 70
                            )
                        )
                        .frame(width: 140, height: 140)

                    Image(systemName: isRecording ? "mic.fill" : "mic")
                        .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .symbolEffect(.variableColor, options: .repeating, isActive: isRecording)
                }

                Button {
                    toggleRecording()
                } label: {
                    Text(isRecording
                        ? localization.t("voice.stopListening")
                        : localization.t("voice.startListening"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                }
                .tvCardStyle()
            }
        }

        // MARK: - Waveform

        private var waveformBackground: some View {
            TimelineView(.animation(minimumInterval: 0.1, paused: !isRecording)) { timeline in
                let phase = timeline.date.timeIntervalSinceReferenceDate

                HStack(spacing: 6) {
                    ForEach(0 ..< 7, id: \.self) { index in
                        let height = barHeight(index: index, phase: phase)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DesignTokens.Primary.p300.opacity(0.6))
                            .frame(width: 6, height: height)
                    }
                }
                .frame(width: 200, height: 180)
                .opacity(isRecording ? 1.0 : 0.0)
                .animation(.easeInOut(duration: 0.3), value: isRecording)
            }
        }

        // MARK: - Transcript

        private var transcriptSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                if transcript.isEmpty {
                    Text(localization.t("voice.searchPrompt"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .multilineTextAlignment(.center)
                } else {
                    Text(transcript)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                }
            }
            .frame(minHeight: 80)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        // MARK: - Suggestions

        private var suggestionsSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                if !suggestions.isEmpty {
                    Text(localization.t("search.suggestions"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                            ForEach(suggestions, id: \.self) { suggestion in
                                suggestionRow(suggestion)
                            }
                        }
                    }
                    .focusSection()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }

        private func suggestionRow(_ suggestion: String) -> some View {
            Button {
                onResult(suggestion)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)

                    Text(suggestion)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
            .focused($focusedSuggestion, equals: suggestion)
        }

        // MARK: - Actions

        private func toggleRecording() {
            isRecording ? stopRecording() : startRecording()
        }

        private func startRecording() {
            transcript = ""
            do {
                try audioService.startRecording()
                isRecording = true
            } catch {
                isRecording = false
            }
        }

        private func stopRecording() {
            let audioData = audioService.stopRecording()
            isRecording = false
            guard !audioData.isEmpty else { return }
            onResult(transcript)
        }

        private func barHeight(index: Int, phase: Double) -> CGFloat {
            let frequency = 2.0 + Double(index) * 0.7
            let amplitude = 30.0 + sin(phase * frequency + Double(index)) * 40.0
            return max(8, CGFloat(amplitude))
        }

        private var micColor: Color {
            isRecording ? DesignTokens.ErrorColor.default : DesignTokens.Primary.p400
        }
    }
#endif
